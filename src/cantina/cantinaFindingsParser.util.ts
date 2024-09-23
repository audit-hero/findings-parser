import { Severity } from "ah-shared"
import { Logger } from "jst-logger"

export const getTitleItems = (
  title: string,
): { name: string; severity?: Severity; url?: string } => {
  let severity
  let { name, url } = cleanName(title)

  if (title.includes("[M-")) {
    severity = Severity.MEDIUM
  } else if (title.includes("[L-")) {
    severity = Severity.LOW
  } else if (title.includes("[N-")) {
    severity = Severity.NON_CRITICAL
  } else if (title.includes("[H-")) {
    severity = Severity.HIGH
  }

  return { name, severity, url }
}

const cleanName = (title: string): { name: string; url?: string } => {
  Logger.trace(() => `cleaning title ${title}`)

  let name = title,
    url

  // remove prefix ##
  if (name.startsWith("## ")) {
    name = name.slice(3)
  }

  // if is a link, remove link and parse url
  if (
    name.startsWith("[[") /* this means the whole title is a link ([title](link)) */ &&
    name.includes("](")
  ) {
    let split = name.split("](")
    name = split[0]
    name = name.slice(1)
    url = split[1].slice(0, -1)
  }

  // remove links but keep link title - [text](link)
  // previous:   name = name.replace(/__|\*|\#|(?:\[([^\]]*)\]\([^)]*\))/gm, '$1')
  name = name.replace(/__|\*|(?:\[([^\]]*)\]\([^)]*\))/gm, "$1")

  // remove all items between []
  // if find [ and closing ], if that is followed by (, then remove the text between ()
  let currentBlock = ""

  for (let i = 0; i < name.length; i++) {
    let char = name[i]
    if (char === "[") {
      currentBlock = ""
    } else if (char === "]") {
      if (currentBlock !== "") {
        name = name.replace(`[${currentBlock}]`, "")
        i -= currentBlock.length + 2
        currentBlock = ""
      } else {
        name = name.slice(0, i) + name.slice(i + 1)
      }
    } else {
      currentBlock += char
    }
  }

  name = name.trim()
  return { name, url }
}
