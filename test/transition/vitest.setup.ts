// shim test() to support jasmine-style done callback: test('foo', done => {...})
const g: any = globalThis
const _test = g.test

const wait = (): [() => void, Promise<void>] => {
  let done: any
  const p = new Promise<void>((resolve, reject) => {
    done = resolve
    done.fail = reject
  })
  return [done, p]
}

const shimmed =
  (g.it =
  g.test =
    (desc: string, fn?: any, timeout?: number) => {
      if (fn && fn.length > 0) {
        _test(
          desc,
          () => {
            const [done, p] = wait()
            fn(done)
            return p
          },
          timeout
        )
      } else {
        _test(desc, fn, timeout)
      }
    })
;['skip', 'only', 'todo', 'concurrent'].forEach(key => {
  shimmed[key] = _test[key]
})

import '../helpers/to-have-warned'

export {}
