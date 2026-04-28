# Notion Setup & Deployment

This guide walks you through setting up a Notion database integration and deploying your Collector app to Vercel.

## Part 1: Notion Integration Setup

### Step 1: Create a Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click **+ New integration**
3. Name your integration **"Collector"**
4. Select the workspace where you want to use this integration
5. Accept the terms and click **Submit**
6. On the confirmation page, copy your **Internal Integration Secret**
   - This is your `NOTION_API_KEY` — store it securely

### Step 2: Create the Notion Database

1. Go to your Notion workspace
2. Create a new database (or use an existing one)
3. Configure the following properties:

| Property Name | Type | Required | Notes |
|---------------|------|----------|-------|
| Title | Title | Yes | Primary field for the page title |
| URL | URL | Yes | The saved URL link |
| Image | Files & Media | No | Thumbnail or screenshot of the page |
| Tags | Multi-select | No | Categories/labels for organization |
| Comment | Text | No | User notes or comments about the link |
| Created | Created time | Yes | Auto-populated timestamp |

**Example Database Layout:**
- Title: "How to Learn TypeScript"
- URL: https://www.typescriptlang.org/docs/
- Tags: programming, learning, typescript
- Comment: "Great introductory resource"
- Created: (auto-set to now)

### Step 3: Get Your Database ID

1. Open your Notion database in a browser
2. Look at the URL in the address bar: `https://notion.so/[WORKSPACE_ID]/[DATABASE_ID]?v=[VIEW_ID]`
3. The `DATABASE_ID` is the 32-character hexadecimal string before the `?v=`

**Example:**
```
URL: https://notion.so/abc123/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=123456
DATABASE_ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Step 4: Connect the Integration to Your Database

1. Open your Notion database page
2. Click the **"..."** (three dots) in the top-right corner
3. Scroll down and select **Connections**
4. Click **+ Add connections**
5. Find and select your **"Collector"** integration
6. Click **Confirm**

The integration now has permission to read/write to this database.

## Part 2: Environment Variables

Add the following to your `.env.local` file:

```env
NOTION_API_KEY=your_internal_integration_secret_here
NOTION_DATABASE_ID=your_32_character_database_id_here
```

**Where to find these:**
- `NOTION_API_KEY`: From Step 1, your Internal Integration Secret
- `NOTION_DATABASE_ID`: From Step 3, the 32-char hex string

## Part 3: Deploying to Vercel

### Step 1: Push to GitHub

Ensure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "chore: add Notion configuration"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Paste your repository URL (e.g., `https://github.com/username/info-collector-app`)
5. Click **Continue**

### Step 3: Configure Environment Variables

1. Under **Environment Variables**, add:
   - `NOTION_API_KEY`: Your integration secret
   - `NOTION_DATABASE_ID`: Your database ID
2. Click **Add** after each variable

### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete (typically 1-3 minutes)
3. You'll get a deployment URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Your Shortcut & Documentation

1. Replace `YOUR-APP.vercel.app` with your actual Vercel URL in:
   - iOS Shortcut configuration
   - Any documentation files
   - Your README

## Verification

### Test the Integration

Once deployed, verify everything works:

```bash
# Replace with your actual URL and token
curl -X POST https://your-app.vercel.app/api/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tags": "test,verification"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "notion-page-id",
    "url": "https://example.com",
    "tags": ["test", "verification"]
  }
}
```

### Check Notion Database

1. Open your Notion database
2. You should see a new entry with the saved URL
3. Verify all properties are populated correctly

## Troubleshooting

### "Integration not connected to database"
- Ensure you followed Step 4 above
- The integration must have explicit permission to the database
- Check that you're using the correct database ID

### "Invalid API key"
- Verify `NOTION_API_KEY` is set correctly
- Copy directly from notion.so/my-integrations without extra spaces
- Rotate the key if you suspect it's compromised

### "Database not found"
- Confirm the `NOTION_DATABASE_ID` is correct (32 hex characters)
- Ensure the database exists and is accessible
- Double-check there are no extra spaces in the ID

### "Deployment fails"
- Check build logs in Vercel dashboard
- Verify all required environment variables are set
- Ensure your repository is accessible from Vercel

### "Properties don't match"
- Verify property names match exactly (case-sensitive)
- Confirm all required properties exist in the database
- Check the property types (URL type, not Text, for URLs)

## Security & Best Practices

- **Never commit secrets**: `.env.local` should be in `.gitignore`
- **Rotate keys periodically**: Update your `NOTION_API_KEY` regularly
- **Use environment-specific tokens**: Consider separate integrations per environment (dev/prod)
- **Monitor permissions**: Regularly review which integrations have database access
- **Audit logs**: Check Notion's activity log for unauthorized access

## Next Steps

1. Test saving URLs from your iOS Shortcut
2. Customize database views in Notion (galleries, timelines, etc.)
3. Set up additional integrations (e.g., automation, webhooks)
4. Monitor API usage in your Vercel dashboard
