// The language a connected blog publishes in. Asked for once, when the blog is
// first connected, because a CMS files a post under a language and there is no
// sensible way to guess which one from a draft. Stored in a cookie beside the
// connections themselves (see CONNECTORS_COOKIE) so the server can read it on
// the first render, and so it outlives a disconnect — the blog does not change
// language because the account signed out of it.

export const BLOG_LANGUAGE_COOKIE = "forward_blog_language"

export type BlogLanguage = {
  /** BCP 47, which is what a CMS files a post under. */
  code: string
  name: string
}

// A preset list rather than free text: the value is a tag a CMS has to
// recognise, so it is chosen from what is on offer.
export const BLOG_LANGUAGES: BlogLanguage[] = [
  { code: "en-us", name: "English (United States)" },
  { code: "en-gb", name: "English (United Kingdom)" },
  { code: "es-es", name: "Spanish" },
  { code: "fr-fr", name: "French" },
  { code: "de-de", name: "German" },
  { code: "it-it", name: "Italian" },
  { code: "nl-nl", name: "Dutch" },
  { code: "pt-br", name: "Portuguese (Brazil)" },
  { code: "sv-se", name: "Swedish" },
  { code: "ja-jp", name: "Japanese" },
  { code: "zh-cn", name: "Chinese (Simplified)" },
]

/** What the dialog opens on, so the dropdown is never empty. */
export const DEFAULT_BLOG_LANGUAGE = BLOG_LANGUAGES[0].code

export function findBlogLanguage(code: string): BlogLanguage | undefined {
  return BLOG_LANGUAGES.find((language) => language.code === code)
}

/**
 * The stored language, or undefined when the question has never been answered
 * — which is exactly what makes the dialog a one-time thing. A code that is no
 * longer on offer reads as unanswered rather than as itself.
 */
export function parseBlogLanguage(value: string | undefined) {
  if (!value || !findBlogLanguage(value)) {
    return undefined
  }
  return value
}

export function blogLanguageName(code: string | undefined) {
  return code ? findBlogLanguage(code)?.name : undefined
}
