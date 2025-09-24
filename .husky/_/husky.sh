#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
    debug() {
        if [ "$HUSKY_DEBUG" = "1" ]; then
            echo "husky (debug) - $1"
        fi
    }

    readonly hook_name="$(basename -- "$0")"
    debug "starting $hook_name..."

    if [ "$HUSKY" = "0" ]; then
        debug "HUSKY env variable is set to 0, skipping hook"
        exit 0
    fi

    if [ -f ~/.huskyrc ]; then
        debug "sourcing ~/.huskyrc"
        . ~/.huskyrc
    fi

    readonly husky_root="$(dirname -- "$(dirname -- "$0")")"
    readonly hook_path="$husky_root/$hook_name"

    if [ -f "$hook_path" ]; then
        debug "running $hook_path"
        . "$hook_path"
    else
        debug "$hook_path not found, skipping"
    fi
fi
