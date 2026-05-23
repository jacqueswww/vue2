import path from 'path'
import webpack from 'webpack'
import { createFsFromVolume, Volume } from 'memfs'
import { RenderOptions } from 'server/create-renderer'
import { createBundleRenderer } from 'server/index'
import VueSSRServerPlugin from 'server/webpack-plugin/server'

type MemFs = ReturnType<typeof createFsFromVolume>

// Webpack 5 assigns sequential numeric IDs to all chunks (including named entry
// chunks like "manifest" and "main"), so async chunks end up with IDs 2, 3, ...
// instead of 0, 1, ... as in webpack 4. This plugin replicates webpack 4
// behavior: named entry chunks keep string IDs, unnamed async chunks get 0, 1, ...
class Webpack4StyleChunkIdsPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap('Webpack4StyleChunkIdsPlugin', compilation => {
      // @ts-ignore — chunkIds hook typing varies across webpack versions
      compilation.hooks.chunkIds.tap('Webpack4StyleChunkIdsPlugin', (chunks: Set<webpack.Chunk>) => {
        // First pass: assign string IDs to named chunks (entry / runtime)
        for (const chunk of chunks) {
          if (chunk.name) {
            // @ts-ignore — id is assignable in the chunkIds hook
            chunk.id = chunk.name
            // @ts-ignore
            chunk.ids = [chunk.name]
          }
        }
        // Second pass: assign sequential numeric IDs to unnamed async chunks
        let counter = 0
        for (const chunk of chunks) {
          if (chunk.id === null || chunk.id === undefined) {
            // @ts-ignore
            chunk.id = counter
            // @ts-ignore
            chunk.ids = [counter]
            counter++
          }
        }
      })
    })
  }
}

export function compileWithWebpack(
  file: string,
  extraConfig?: webpack.Configuration
) {
  const config: webpack.Configuration = {
    mode: 'development',
    entry: path.resolve(__dirname, 'fixtures', file),
    optimization: {
      chunkIds: false
    },
    plugins: [new Webpack4StyleChunkIdsPlugin()],
    module: {
      rules: [
        {
          test: /async-.*\.js$/,
          loader: require.resolve('./async-loader')
        },
        {
          test: /\.(png|woff2|css)$/,
          type: 'asset/resource',
          generator: { filename: '[name][ext]' }
        }
      ]
    }
  }
  if (extraConfig) {
    const { output: extraOutput, optimization: extraOpt, plugins: extraPlugins, ...rest } = extraConfig
    Object.assign(config, rest)
    if (extraOutput) config.output = { chunkFilename: '[id].js', ...extraOutput }
    if (extraOpt) config.optimization = { ...config.optimization, ...extraOpt }
    if (extraPlugins) config.plugins = [...(config.plugins || []), ...extraPlugins]
  }

  const compiler = webpack(config)
  const vol = new Volume()
  const fs = createFsFromVolume(vol)
  compiler.outputFileSystem = fs as any

  return new Promise<MemFs>((resolve, reject) => {
    compiler.run(err => {
      if (err) {
        reject(err)
      } else {
        resolve(fs)
      }
    })
  })
}

export async function createWebpackBundleRenderer(
  file: string,
  options?: RenderOptions & { asBundle?: boolean }
) {
  const asBundle = !!(options && options.asBundle)
  if (options) delete options.asBundle

  const fs = await compileWithWebpack(file, {
    target: 'node',
    devtool: asBundle ? 'source-map' : false,
    output: {
      path: '/',
      filename: 'bundle.js',
      library: { type: 'commonjs2' }
    },
    externals: [require.resolve('../../../dist/vue.runtime.common.js')],
    plugins: asBundle ? [new VueSSRServerPlugin()] : []
  })

  const bundle = asBundle
    ? JSON.parse(fs.readFileSync('/vue-ssr-server-bundle.json', 'utf-8') as string)
    : fs.readFileSync('/bundle.js', 'utf-8') as string
  return createBundleRenderer(bundle, options)
}
