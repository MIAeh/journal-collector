#!/usr/bin/env python3
"""Generates a Save to Collector.shortcut with NO dictionary parameters.

Both url and key are query params so the shortcut uses only WFTextTokenString
in WFURL — no WFDictionaryParameterState / WFDictionaryParameterKeyValuePair
which crashes on macOS 26 / iOS 19 WorkflowKit.
"""
import plistlib
import os
import sys

save_api_key = os.environ.get("SAVE_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else None)
if not save_api_key:
    print("Usage: SAVE_API_KEY=xxx python3 gen-shortcut.py", file=sys.stderr)
    sys.exit(1)

BASE = "https://info-collector-app.vercel.app"

# Auth key is static in the URL — no variable reference needed there.
# The shared content (URL or text) is sent as raw body via WFHTTPBodyType "File",
# which uses WFTokenAttachment (not WFDictionaryParameterKeyValuePair) — no crash.

shortcut = {
    "WFWorkflowClientVersion": "1165.0.0",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowName": "Save to Collector",
    # Accept URLs and text (XHS shares text with embedded link)
    "WFWorkflowInputContentItemClasses": ["WFURLContentItem", "WFStringContentItem"],
    "WFWorkflowHasShortcutInputVariables": True,
    "WFWorkflowOutputContentItemClasses": [],
    "WFWorkflowTypes": ["NCWidget", "WatchKit"],
    "WFWorkflowIcon": {
        "WFWorkflowIconStartColor": 946986751,
        "WFWorkflowIconGlyphNumber": 59511,
    },
    "WFWorkflowActions": [
        # POST raw shortcut input as body — server extracts the URL from it.
        # WFHTTPBodyType "File" uses WFTokenAttachment, not WFDictionaryParameterKeyValuePair.
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
            "WFWorkflowActionParameters": {
                "WFHTTPMethod": "POST",
                "WFURL": f"{BASE}/api/save?key={save_api_key}",
                "WFHTTPBodyType": "File",
                "WFRequestVariable": {
                    "Value": {
                        "Type": "ExtensionInput",
                    },
                    "WFSerializationType": "WFTokenAttachment",
                },
            },
        },
        # Show notification
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.notification",
            "WFWorkflowActionParameters": {
                "WFNotificationActionTitle": "Saved!",
                "WFNotificationActionBody": "",
                "WFNotificationActionSound": True,
            },
        },
    ],
}

output_path = os.path.expanduser("~/Desktop/Save to Collector.shortcut")
with open(output_path, "wb") as f:
    plistlib.dump(shortcut, f, fmt=plistlib.FMT_BINARY)

print(f"Written: {output_path}")
