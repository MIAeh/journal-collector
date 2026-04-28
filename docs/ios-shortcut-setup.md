# iOS Shortcut Setup

This guide walks you through creating and configuring an iOS Shortcut to save URLs to the Collector app.

## Prerequisites

- iOS device with the Shortcuts app installed (built-in on iOS 12+)
- Access to your deployed Collector app
- Your Collector app API token

## Step 1: Create the Shortcut

1. Open the **Shortcuts** app on your iOS device
2. Tap the **+** button to create a new shortcut
3. Name it **"Save to Collector"**

## Step 2: Configure Input from Share Sheet

1. Tap **Add Action**
2. Search for "Ask for" and select **Ask for [URL]**
3. Set the prompt to "URL to save:"
4. Ensure it's set to accept **URLs** only

Alternatively, to make it work directly from Share Sheet:
1. Add action: **Receive** from **Share Sheet**
2. Set to accept **URLs**
3. This allows triggering the shortcut from Safari or any app's Share menu

## Step 3: Add Optional Tags Prompt (Optional)

1. Add another action: **Ask for [Text]**
2. Set the prompt to **"Tags (comma-separated):"**
3. Set the type to **Text**
4. This step is optional; users can skip when prompted

## Step 4: Save to Collector

1. Add action: **Get contents of**
2. Configure the request:
   - **URL**: `https://YOUR-APP.vercel.app/api/save`
   - **Method**: POST
   - **Headers**:
     - `Authorization`: `Bearer YOUR_TOKEN`
     - `Content-Type`: `application/json`
   - **Body** (as JSON):
     ```json
     {
       "url": "[Shortcut Input from Step 2]",
       "tags": "[Text input from Step 3 - split by comma if present]"
     }
     ```

## Step 5: Show Confirmation

1. Add action: **Show Result**
2. Set the title to **"Saved to Collector!"**
3. Set the message to show the response from the API

## Usage

### From Safari
1. Open the webpage you want to save
2. Tap the **Share** button (square with arrow)
3. Scroll right and tap **Save to Collector**
4. (Optional) Enter tags when prompted
5. See confirmation notification

### From Any App
The shortcut works from any app that supports URL sharing:
- Mail links
- Messages links
- Notes links
- Twitter/X posts
- Reddit threads
- Any web browser

## Tips & Tricks

- **Skip Tags**: If you don't want to add tags, simply tap the suggested text field and leave it blank
- **Faster Tagging**: Pre-define common tags to quickly select from history
- **Batch Adding**: You can run the shortcut multiple times in succession for multiple URLs
- **Automation**: Set up automation rules to run the shortcut on specific triggers (e.g., when you open Safari)

## Troubleshooting

**"Authorization failed"**
- Check that `YOUR_TOKEN` is correctly set in the shortcut
- Verify the token is valid in your Collector app settings
- Ensure the token hasn't expired

**"Invalid URL response"**
- Confirm your Vercel app URL is correct (replace `YOUR-APP`)
- Check that your API endpoint `/api/save` is accessible
- Verify your internet connection

**"JSON parsing error"**
- Ensure the body structure matches the expected format
- Check that URL and tags are properly formatted
- Review your API logs for detailed error messages

## API Response Format

The shortcut expects a JSON response from your API:
```json
{
  "success": true,
  "data": {
    "id": "unique-id",
    "url": "saved-url",
    "tags": ["tag1", "tag2"]
  }
}
```

## Security Notes

- Store your `YOUR_TOKEN` securely in the shortcut
- Don't share your shortcut with others if it contains your token
- Consider using environment-specific tokens if you have multiple Collector instances
- Rotate your token periodically
