export interface Issues {
  [name: string]: IssuesNode
}

export type IssuesNode = NormalizedIssuesNode | undefined

export interface NormalizedIssues {
  [name: string]: NormalizedIssuesNode
}

type NormalizedIssuesNode = string | Issues

export const BaseIssue = 'react-zen/BaseIssue'
export type BaseIssue = typeof BaseIssue

function normalizeIssues<I extends Issues>(
  ...issues: (I | string | undefined)[]
): undefined | NormalizedIssues {
  if (issues.length === 0) {
    return
  }

  let result = {} as any
  let hasErrors = false
  do {
    let issue = issues.shift()
    if (typeof issue === 'string' || Array.isArray(issue)) {
      issue = { [BaseIssue]: issue } as any
    }
    if (issue) {
      for (let [key, value] of Object.entries(issue)) {
        if (value !== undefined) {
          hasErrors = true
          result[key] = value
        }
      }
    }
  } while (issues.length)

  return hasErrors ? result : (undefined as any)
}

export default normalizeIssues
