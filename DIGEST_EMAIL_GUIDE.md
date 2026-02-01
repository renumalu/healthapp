# Weekly Digest Email Function - Setup & Troubleshooting Guide

**Status**: ✅ Fixed and Ready to Use

---

## Overview

There are **two digest functions**:

1. **`send-weekly-digest`** - Sends personalized weekly digest emails to a specific user
2. **`weekly-digest`** - Generates digest data (called on a schedule or manually)

Both have been fixed to handle errors gracefully and work without optional dependencies.

---

## Fixed Issues ✅

### Issue 1: Missing Resend API Key
**Problem**: Function would crash if `RESEND_API_KEY` wasn't configured  
**Fix**: Now checks for API key and returns clear error message

**Status**: ✅ FIXED

### Issue 2: Invalid Dashboard URL
**Problem**: Dashboard URL was constructed from Supabase URL and wouldn't work  
**Fix**: Changed to static `https://humanos.app`

**Status**: ✅ FIXED

### Issue 3: Invalid "From" Email
**Problem**: Used demo Resend email `onboarding@resend.dev`  
**Fix**: Now uses `RESEND_FROM_EMAIL` env var or defaults to `noreply@humanos.app`

**Status**: ✅ FIXED

### Issue 4: AI API Fallback
**Problem**: If Lovable API unavailable, function would crash  
**Fix**: Gracefully falls back to basic summary

**Status**: ✅ FIXED

### Issue 5: Poor Error Messages
**Problem**: Errors weren't descriptive  
**Fix**: Added detailed console logging and better error messages

**Status**: ✅ FIXED

---

## Setup Requirements

### For Email Sending (`send-weekly-digest`)

You need to configure these environment variables in Supabase:

```env
# Required for sending emails
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Optional - defaults to noreply@humanos.app
RESEND_FROM_EMAIL=your-email@yourdomain.com
```

**Get Resend API Key**:
1. Go to [https://resend.com](https://resend.com)
2. Create account and project
3. Copy API key from settings
4. Add to Supabase project secrets

### For AI Summaries (`weekly-digest`)

Optional - function works without it:

```env
LOVABLE_API_KEY=your-lovable-api-key
```

If not provided, function uses basic summary generation.

---

## How to Use

### Option 1: User Requests Their Digest (Manual)

**Frontend Call**:
```typescript
import { supabase } from "@/integrations/supabase/client";

async function sendWeeklyDigest() {
  const { data, error } = await supabase.functions.invoke('send-weekly-digest', {
    method: 'POST'
  });
  
  if (error) {
    console.error('Error sending digest:', error);
  } else {
    console.log('Digest sent:', data);
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Weekly digest sent successfully",
  "email": "user@example.com"
}
```

### Option 2: Scheduled Digest for All Users

**Supabase Cron Job Setup**:

1. Go to Supabase Project → SQL Editor
2. Run this to create a cron job:

```sql
SELECT cron.schedule(
  'send-weekly-digest-all',
  '0 9 * * 1',  -- Every Monday at 9 AM
  $$
  SELECT
    net.http_post(
      url:='https://[YOUR_PROJECT_ID].functions.supabase.co/functions/v1/weekly-digest',
      headers:='{"Authorization": "Bearer [ANON_KEY]", "Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

---

## Testing

### Test Email Sending

```bash
curl -X POST http://localhost:54321/functions/v1/send-weekly-digest \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test Digest Generation

```bash
curl -X POST http://localhost:54321/functions/v1/weekly-digest \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "specific-user-id"}'
```

---

## Troubleshooting

### Email Not Sending?

**Check 1**: Verify Resend API key is set
```sql
SELECT * FROM vault.decrypted_secrets WHERE name = 'RESEND_API_KEY';
```

**Check 2**: Check Supabase logs
- Go to Supabase → Edge Functions → Logs
- Filter by `send-weekly-digest`
- Look for error messages

**Check 3**: Verify email address
- User must have an email in their auth profile
- Email must be valid format

### AI Summary Not Generated?

**This is OK!** Function falls back to basic summary if:
- `LOVABLE_API_KEY` is not set
- API is unavailable
- API returns error

Basic summary is still good quality and informative.

### Users Not Receiving Emails?

**Check Resend Dashboard**:
1. Go to [https://resend.com](https://resend.com)
2. Check email sending history
3. Verify sender domain is verified

**Check Email Content**:
- May be going to spam folder
- Verify email template renders correctly

---

## Email Template Content

The email includes:

- **Header**: Personalized greeting
- **Motivation Quote**: Based on user's performance
- **Weekly Stats Dashboard**:
  - Current streak (🔥)
  - Average energy level (⚡)
  - Total focus time (🎯)
  - Meals logged (🥗)
  - Workouts completed (💪)
  - Total points (🏆)
- **Call to Action**: Link to dashboard
- **Footer**: Encouragement message

---

## Function Details

### `send-weekly-digest`

**Purpose**: Send personalized digest to authenticated user  
**Trigger**: Manual user request  
**Authentication**: Required (JWT token)  
**Requires**: 
- User email in profile
- Resend API key configured

**Returns**:
```json
{
  "success": true,
  "message": "Weekly digest sent successfully",
  "email": "user@example.com"
}
```

**Errors**:
- 401: Not authenticated
- 500: Resend API error or missing config

### `weekly-digest`

**Purpose**: Generate digest for single user or batch process  
**Trigger**: Scheduled job or manual request  
**Authentication**: Required (service key recommended)  
**Optional**: AI summary (requires LOVABLE_API_KEY)

**Returns**:
```json
{
  "userId": "user-id",
  "userName": "John Doe",
  "generatedAt": "2026-02-01T10:00:00Z",
  "stats": {...},
  "aiSummary": "Your summary text...",
  "weeklyHighlights": [...]
}
```

---

## Email Customization

To customize the email template:

1. Open `supabase/functions/send-weekly-digest/index.ts`
2. Find the `emailHtml` template (around line 147)
3. Modify HTML/CSS as needed
4. Colors used:
   - Primary: `#8b5cf6` (purple)
   - Secondary: `#6366f1` (indigo)

---

## Best Practices

✅ **DO**:
- Send digest on Monday morning for weekly review
- Personalize with user's name and streak
- Include actionable recommendations
- Test with real user data

❌ **DON'T**:
- Send too frequently (once per week is ideal)
- Send at inconsistent times
- Include sensitive information in preview
- Use unverified email addresses

---

## Monitoring

### Key Metrics to Track

```sql
-- Count digests sent this week
SELECT COUNT(*) FROM vector_logs 
WHERE path LIKE '%send-weekly-digest%' 
AND created_at > NOW() - INTERVAL '7 days';

-- Check for errors
SELECT * FROM vector_logs 
WHERE path LIKE '%send-weekly-digest%' 
AND status_code != 200;
```

### Alert Conditions

Set up alerts for:
- ❌ Resend API failures
- ❌ Authentication errors
- ❌ Users without email addresses
- ⚠️ API rate limiting

---

## FAQ

**Q: Can I send digest without Resend?**  
A: The `send-weekly-digest` function requires Resend for email sending. However, `weekly-digest` generates digest data without it.

**Q: What if user hasn't logged activities?**  
A: Function still generates digest with zero values. Email shows "Keep tracking!" encouragement.

**Q: How often should I send digests?**  
A: Once per week is recommended. Configure cron job for specific day/time.

**Q: Can I customize the email template?**  
A: Yes! Edit the HTML template in `send-weekly-digest/index.ts` around line 147.

**Q: What happens if AI API fails?**  
A: Function automatically falls back to basic summary. User still gets email.

---

## Next Steps

1. **Set up Resend account**: [https://resend.com](https://resend.com)
2. **Get API key** and add to Supabase secrets
3. **Test with**: `curl` command above
4. **Set up cron job** for weekly sends
5. **Monitor logs** for any issues

---

**Status**: ✅ Ready for Production  
**Last Updated**: February 1, 2026  
**Maintainer**: HumanOS Team
