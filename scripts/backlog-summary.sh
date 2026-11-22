#!/usr/bin/env bash
# backlog-summary.sh: write docs/BACKLOG-SUMMARY.md, the open stories of docs/BACKLOG.md
# in one short list per epic, with status counts. Derived view: never edit it by hand.
#
#   scripts/backlog-summary.sh            regenerate the summary
#   scripts/backlog-summary.sh --check    exit 1 if the summary is missing or stale (for the gate)
#
# Reads the playbook backlog format: "## <section>" headings and
# "### <status> <ID> — <Title> (<size>)" stories. ✅ counts as done, any other status as open.
# Copied from vereinssoftware/scripts/backlog-summary.sh (2026-11-22). Bash 3.2-safe.
set -o errexit -o nounset -o pipefail

BACKLOG="${BACKLOG:-docs/BACKLOG.md}"
SUMMARY="${SUMMARY:-docs/BACKLOG-SUMMARY.md}"
check=0
case "${1-}" in
  --check) check=1 ;;
  "") ;;
  -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "usage: $(basename "$0") [--check]" >&2; exit 2 ;;
esac
[[ -f "$BACKLOG" ]] || { echo "backlog-summary: $BACKLOG not found" >&2; exit 2; }

render() {
  awk -v src="$(basename "$BACKLOG")" '
    function flush() {
      if (sec != "" && total > 0) {
        body = body "\n## " sec " (" done "/" total " done)\n"
        body = body (open == "" ? "\nAll done.\n" : "\n" open)
      }
      total = 0; done = 0; open = ""
    }
    /^## /  { flush(); sec = substr($0, 4); next }
    /^### / {
      line = substr($0, 5); split(line, w, " "); st = w[1]
      if (!(st in count)) order[++n] = st
      count[st]++; total++
      # Regex, not ==: awk compares strings by locale collation, where emoji can tie.
      rest = substr(line, length(st) + 2)
      # Line links (#L<n>): the Orca rich Markdown editor follows only these into
      # another file. They stay right because the gate fails on a stale summary.
      link = "[" rest "](" src "#L" NR ")"
      if (st ~ /^✅$/) { done++; alldone++ } else { open = open "- " st " " link "\n"; allopen++ }
    }
    END {
      flush()
      known = "✅ 🟡 ⏳ ⏭️ 🚨"; k = split(known, ks, " ")
      stats = ""
      for (i = 1; i <= k; i++) if (ks[i] in count) stats = stats " · " ks[i] " " count[ks[i]]
      for (i = 1; i <= n; i++) if (index(" " known " ", " " order[i] " ") == 0) stats = stats " · " order[i] " " count[order[i]]
      print "# Backlog summary"
      print ""
      print "Generated from [" src "](" src ") by `scripts/backlog-summary.sh`; don'\''t edit by hand."
      print ""
      printf "**%d open · %d done**%s\n", allopen, alldone, stats
      printf "%s", body
    }' "$BACKLOG"
}

if ((check)); then
  if [[ -f "$SUMMARY" ]] && diff -q <(render) "$SUMMARY" >/dev/null; then
    echo "$SUMMARY: up to date"; exit 0
  fi
  echo "$SUMMARY is stale; run scripts/backlog-summary.sh" >&2; exit 1
fi

tmp="$(mktemp "$SUMMARY.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
render >"$tmp"
mv "$tmp" "$SUMMARY"; trap - EXIT
echo "$SUMMARY: $(grep -c '^- ' "$SUMMARY" || true) open stories"
