#!/usr/bin/env python3
"""Generates two shortcuts:
  1. Save to Collector (Share Sheet) — triggered from XHS share sheet
  2. Save Clipboard (Back Tap / Action Button) — reads clipboard, no share needed
"""
import plistlib
import os
import sys

save_api_key = os.environ.get("SAVE_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else None)
if not save_api_key:
    print("Usage: SAVE_API_KEY=xxx python3 gen-shortcut.py", file=sys.stderr)
    sys.exit(1)

BASE = "https://info-collector-app.vercel.app"
API_URL = f"{BASE}/api/save?key={save_api_key}"

HTTP_ACTION = "is.workflow.actions.downloadurl"
NOTIFY_ACTION = "is.workflow.actions.notification"

def http_post_raw(input_token: dict) -> dict:
    """POST action that sends a variable as raw body (WFTokenAttachment — no dict crash)."""
    return {
        "WFWorkflowActionIdentifier": HTTP_ACTION,
        "WFWorkflowActionParameters": {
            "WFHTTPMethod": "POST",
            "WFURL": API_URL,
            "WFHTTPBodyType": "File",
            "WFRequestVariable": input_token,
        },
    }

def notify(title: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": NOTIFY_ACTION,
        "WFWorkflowActionParameters": {
            "WFNotificationActionTitle": title,
            "WFNotificationActionBody": "",
            "WFNotificationActionSound": True,
        },
    }

ICON_BASE = {
    "WFWorkflowClientVersion": "1165.0.0",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowHasShortcutInputVariables": True,
    "WFWorkflowOutputContentItemClasses": [],
    "WFWorkflowTypes": ["NCWidget", "WatchKit"],
    "WFWorkflowIcon": {
        "WFWorkflowIconStartColor": 946986751,
        "WFWorkflowIconGlyphNumber": 59511,
    },
}

# ── Shortcut 1: Share Sheet ──────────────────────────────────────────────────
# Triggered from XHS share sheet. Input = whatever XHS passes (URL or text).
share_shortcut = {
    **ICON_BASE,
    "WFWorkflowName": "Save to Collector",
    "WFWorkflowInputContentItemClasses": ["WFURLContentItem", "WFStringContentItem"],
    "WFWorkflowActions": [
        http_post_raw({
            "Value": {"Type": "ExtensionInput"},
            "WFSerializationType": "WFTokenAttachment",
        }),
        notify("Saved!"),
    ],
}

# ── Shortcut 2: Clipboard ────────────────────────────────────────────────────
# Triggered by Back Tap / Action Button / Home Screen widget.
# In XHS: tap Share → Copy Link → trigger this shortcut.
# No share sheet needed — reads clipboard directly.
clipboard_shortcut = {
    **ICON_BASE,
    "WFWorkflowName": "Save Clipboard",
    "WFWorkflowInputContentItemClasses": [],   # no share sheet input
    "WFWorkflowActions": [
        # Step 1: get clipboard contents
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.getclipboardcontents",
            "WFWorkflowActionParameters": {},
        },
        # Step 2: POST clipboard as raw body
        http_post_raw({
            "Value": {
                "OutputUUID": "",
                "OutputName": "Clipboard",
                "Type": "ActionOutput",
            },
            "WFSerializationType": "WFTokenAttachment",
        }),
        notify("Saved!"),
    ],
}

def write(shortcut: dict, name: str) -> None:
    path = os.path.expanduser(f"~/Desktop/{name}.shortcut")
    with open(path, "wb") as f:
        plistlib.dump(shortcut, f, fmt=plistlib.FMT_BINARY)
    print(f"Written: {path}")

write(share_shortcut, "Save to Collector")
write(clipboard_shortcut, "Save Clipboard")