#!/usr/bin/env python3
"""Generates a Save to Collector.shortcut file for iOS/macOS.

URL strategy: pass the shared URL as ?url=<input> query param instead of a
JSON body. This avoids the WFDictionaryParameterKeyValuePair variable-token
format that crashes Shortcuts on macOS 26 / WorkflowKit.
"""
import plistlib
import os
import sys

save_api_key = os.environ.get("SAVE_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else None)
if not save_api_key:
    print("Usage: SAVE_API_KEY=xxx python3 gen-shortcut.py", file=sys.stderr)
    sys.exit(1)

BASE = "https://info-collector-app.vercel.app"

# The WFURL value is a WFTextTokenString with the Shortcut Input variable
# appended as a query param. Position of \uFFFC = len(prefix).
URL_PREFIX = f"{BASE}/api/save?url="
# \uFFFC is the Unicode object replacement character — Shortcuts token placeholder
url_token_string = URL_PREFIX + "\uFFFC"
attachment_range = "{" + str(len(URL_PREFIX)) + ", 1}"

shortcut = {
    "WFWorkflowClientVersion": "1165.0.0",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowName": "Save to Collector",
    "WFWorkflowInputContentItemClasses": ["WFURLContentItem"],
    "WFWorkflowHasShortcutInputVariables": True,
    "WFWorkflowOutputContentItemClasses": [],
    "WFWorkflowTypes": ["NCWidget", "WatchKit"],
    "WFWorkflowIcon": {
        "WFWorkflowIconStartColor": 946986751,
        "WFWorkflowIconGlyphNumber": 59511,
    },
    "WFWorkflowActions": [
        # Action 1: POST ?url=<Shortcut Input> — no JSON body, no WFDictionaryParameterKeyValuePair
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
            "WFWorkflowActionParameters": {
                "WFHTTPMethod": "POST",
                "WFURL": {
                    "Value": {
                        "string": url_token_string,
                        "attachmentsByRange": {
                            attachment_range: {"Type": "ExtensionInput"},
                        },
                    },
                    "WFSerializationType": "WFTextTokenString",
                },
                "WFHTTPHeaders": {
                    "Value": {
                        "WFDictionaryFieldValueItems": [
                            {
                                "WFItemType": 0,
                                "WFKey": {
                                    "Value": "x-api-key",
                                    "WFSerializationType": "WFTextTokenString",
                                },
                                "WFValue": {
                                    "Value": save_api_key,
                                    "WFSerializationType": "WFTextTokenString",
                                },
                            },
                        ]
                    },
                    "WFSerializationType": "WFDictionaryFieldValue",
                },
            },
        },
        # Action 2: Show notification
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
print(f"URL attachment range: {attachment_range}")
