#!/usr/bin/env bash
# kanidm-setup.sh — set up the CMS's Kanidm OAuth2 client and its groups.
#
#   scripts/kanidm-setup.sh --url https://payload.idiot.games            # dry run: prints the plan
#   scripts/kanidm-setup.sh --url https://payload.idiot.games --apply    # makes the changes
#
# Options:
#   --client NAME       OAuth2 client name (default: payload); KANIDM_CLIENT_ID in the app
#   --url URL           public URL of the CMS (NEXT_PUBLIC_SERVER_URL), required
#   --display NAME      name on the Kanidm apps page (default: "MakerSpace CMS")
#   --managed-by NAME   entry manager of all three groups (default: vereinssoftware_svc)
#   --account NAME      Kanidm account to act as (default: idm_admin@idm.msbid.de)
#   --issuer URL        Kanidm base URL for KANIDM_ISSUER (default: from KANIDM_URL
#                       or the uri in ~/.config/kanidm)
#   --apply             make the changes; without it nothing is changed
#
# Derived from the client name (here: payload):
#   dienst_payload        may log in; role Redakteur   (cms_roles: editor)
#   dienst_payload_reviewer  role Reviewer: approves and publishes   (cms_roles: editor, reviewer)
#   dienst_payload_admin     role Administrator: also users and roles (cms_roles: editor, admin)
#   reviewer and admin are nested in dienst_payload, so each person needs one group
#
# Runs on your own machine with the kanidm CLI, logged in as --account
# (kanidm login -D idm_admin@idm.msbid.de); the CMS server needs no kanidm.
# Safe to re-run: existing groups and the client are kept, maps are overwritten
# with the values above. Nothing is ever deleted. With --apply the last step
# prints the .env lines for the CMS server, client secret included: copy them
# into the server's .env, never into a chat or ticket.
set -euo pipefail

client=payload
url=''
display='MakerSpace CMS'
managed_by=vereinssoftware_svc
issuer=''
account=idm_admin@idm.msbid.de
apply=false

die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
need_arg() { [ $# -ge 2 ] && [ -n "$2" ] || die "$1 needs a value"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --client) need_arg "$@"; client=$2; shift 2 ;;
    --url) need_arg "$@"; url=$2; shift 2 ;;
    --display) need_arg "$@"; display=$2; shift 2 ;;
    --managed-by) need_arg "$@"; managed_by=$2; shift 2 ;;
    --issuer) need_arg "$@"; issuer=$2; shift 2 ;;
    --account) need_arg "$@"; account=$2; shift 2 ;;
    --apply) apply=true; shift ;;
    -h | --help) sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown option $1 (see --help)" ;;
  esac
done

# Fail fast, naming every problem at once.
problems=()
[[ $client =~ ^[a-z][a-z0-9_-]*$ ]] || problems+=("--client '$client': lowercase letters, digits, _ and - only")
[[ $url =~ ^https://[^/]+$ ]] || problems+=("--url '${url}': required, https://host without a trailing slash or path")
[[ $account =~ ^[a-z][a-z0-9_@.-]*$ ]] || problems+=("--account '$account' is not a Kanidm name")
[[ $managed_by =~ ^[a-z][a-z0-9_@.-]*$ ]] || problems+=("--managed-by '$managed_by' is not a Kanidm name")
command -v kanidm >/dev/null || problems+=("the kanidm CLI is not installed")
if [ ${#problems[@]} -gt 0 ]; then
  printf '\033[31merror:\033[0m %s\n' "${problems[@]}" >&2
  exit 1
fi

# every kanidm call below acts as this account (the CLI reads KANIDM_NAME)
export KANIDM_NAME=$account

users="dienst_${client}"
reviewers="dienst_${client}_reviewer"
admins="dienst_${client}_admin"
callback="${url}/api/users/oauth/kanidm/callback"

step() { printf '\n\033[36m[kanidm-setup]\033[0m %s\n' "$1"; }
# run <cmd...>: print it; execute only with --apply
run() {
  printf '  $'; printf ' %q' "$@"; printf '\n'
  if $apply; then "$@"; fi
}
# exists <group|oauth2> <name>: true if Kanidm already has that entry
exists() {
  local out
  if [ "$1" = oauth2 ]; then out=$(kanidm system oauth2 get "$2" 2>/dev/null || true)
  else out=$(kanidm group get "$2" 2>/dev/null || true); fi
  grep -Eq "^name: $2\$" <<<"$out"
}
# ensure <group|oauth2> <name> <create cmd...>: create only if missing
ensure() {
  local kind=$1 name=$2; shift 2
  if $apply && exists "$kind" "$name"; then
    printf '  = %s %s exists, kept\n' "$kind" "$name"
  else
    run "$@"
  fi
}

if $apply; then
  kanidm self whoami >/dev/null 2>&1 || die "$account is not logged in: run 'kanidm login -D $account' first"
else
  printf '\033[33mdry run\033[0m: printing the plan, changing nothing. Add --apply to make the changes.\n'
fi

printf 'acting as %s\n' "$account"

step "groups (entry manager: $managed_by)"
ensure group "$users" kanidm group create "$users"
ensure group "$reviewers" kanidm group create "$reviewers"
ensure group "$admins" kanidm group create "$admins"
# one place for the manager: covers new groups and existing ones alike
run kanidm group set-entry-manager "$users" "$managed_by"
run kanidm group set-entry-manager "$reviewers" "$managed_by"
run kanidm group set-entry-manager "$admins" "$managed_by"
run kanidm group add-members "$users" "$reviewers" "$admins"

step "OAuth2 client $client"
ensure oauth2 "$client" kanidm system oauth2 create "$client" "$display" "$url"
run kanidm system oauth2 add-redirect-url "$client" "$callback"
run kanidm system oauth2 enable-strict-redirect-url "$client"
run kanidm system oauth2 prefer-short-username "$client"

step "who may log in, and which CMS role they get"
run kanidm system oauth2 update-scope-map "$client" "$users" openid email profile
run kanidm system oauth2 update-claim-map "$client" cms_roles "$users" editor
run kanidm system oauth2 update-claim-map "$client" cms_roles "$reviewers" reviewer
run kanidm system oauth2 update-claim-map "$client" cms_roles "$admins" admin
run kanidm system oauth2 update-claim-map-join "$client" cms_roles array

# Kanidm base URL for KANIDM_ISSUER: --issuer, else the CLI's own settings.
if [ -z "$issuer" ]; then
  issuer=${KANIDM_URL:-}
  cfg="${XDG_CONFIG_HOME:-$HOME/.config}/kanidm"
  if [ -z "$issuer" ] && [ -f "$cfg" ]; then
    issuer=$(sed -nE 's/^[[:space:]]*uri[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$cfg" | head -1)
  fi
fi
issuer=${issuer%/}

step ".env for the CMS server"
if $apply; then
  secret=$(kanidm system oauth2 show-basic-secret "$client" | tail -1 | tr -d '[:space:]')
  [ -n "$secret" ] || die "could not read the client secret (kanidm system oauth2 show-basic-secret $client)"
else
  secret='<printed with --apply>'
fi
cat <<EOF
  Copy into the server's .env (secret: never into a chat or ticket):

KANIDM_ISSUER=${issuer:-<your Kanidm base URL, e.g. https://idm.example.org>}
KANIDM_CLIENT_ID=$client
KANIDM_CLIENT_SECRET=$secret

  Then on the server: docker compose -f docker-compose.prod.yml up -d
  People: editors to $users, reviewers to $reviewers, admins to $admins
  (or let $managed_by do it). Changes apply at their next login.
EOF
