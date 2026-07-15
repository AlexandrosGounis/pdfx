import { useEffect, useState } from 'react'

const compact = new Intl.NumberFormat('en', { notation: 'compact' })

export function useGitHubStars(repo: string | null): string | null {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    if (!repo) return
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStars(data?.stargazers_count || null))
      .catch(() => {})
  }, [repo])

  return stars === null ? null : compact.format(stars)
}
