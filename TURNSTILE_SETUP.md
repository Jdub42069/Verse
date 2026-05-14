# Cloudflare Turnstile Setup Instructions

Your app now has Cloudflare Turnstile bot protection enabled on the signup flow. Turnstile is Cloudflare's free, privacy-focused alternative to traditional captchas with better user experience.

## 1. Create a Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free Cloudflare account
3. Verify your email address

## 2. Get Your Site Key

1. After logging in, go to https://dash.cloudflare.com/?to=/:account/turnstile
2. Click "Add Site" to create a new Turnstile widget
3. Enter your site details:
   - **Site name**: Your app name (e.g., "Verse Dating App")
   - **Domain**: Add `localhost` for development testing
   - **Widget Mode**: Choose "Managed" (recommended) for automatic challenge difficulty
4. Click "Create"
5. Copy your **Site Key**

## 3. Get Your Secret Key

1. In the same dashboard, find your **Secret Key**
2. Keep this key secure - it should never be exposed in client code
3. Copy the secret key for the next step

## 4. Add Site Key to Your Environment

Update your `.env` file:

```
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key-here
```

## 5. Configure Secret in Supabase

The Turnstile secret key needs to be set in your Supabase project:

1. Go to your Supabase dashboard at https://supabase.com/dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add a new secret:
   - **Name**: `TURNSTILE_SECRET_KEY`
   - **Value**: Your Turnstile secret key from step 3

## How It Works

1. **Signup Flow**: When users try to sign up, they see a Turnstile widget
2. **Smart Verification**: Turnstile automatically adjusts challenge difficulty based on risk
3. **Token Generation**: Upon successful verification, a token is generated
4. **Backend Verification**: The token is sent to your Supabase edge function
5. **Cloudflare Check**: The edge function verifies the token with Cloudflare servers
6. **Signup**: Only if the verification passes will the signup proceed

## Testing

1. Restart your development server after adding the environment variables
2. Go to the signup screen
3. Fill in the form - you should see the Turnstile widget appear
4. The widget will automatically verify you're human (usually invisible or one click)
5. Submit the form - it should only work after Turnstile verification

## Why Turnstile?

Cloudflare Turnstile offers several advantages:

### Free Tier Benefits
- **Completely free** with no request limits
- No credit card required
- Perfect for apps of any size

### Better User Experience
- Often invisible to users (no puzzle solving)
- Privacy-focused (no tracking across sites)
- Faster than traditional captchas
- Better accessibility

### Security
- Backed by Cloudflare's threat intelligence
- Automatic bot detection
- Lower false positive rates

## Widget Modes

- **Managed** (Recommended): Cloudflare automatically determines if a challenge is needed
- **Non-Interactive**: Always shows a checkbox but no puzzles
- **Invisible**: Completely invisible, best UX but may need fallback

You can change the widget mode in your Cloudflare dashboard.

## Security Notes

- The site key is public and safe to include in your app
- The secret key must NEVER be exposed in client code
- All verification happens server-side for maximum security
- Users only see the captcha during signup, not login
- Turnstile tokens are single-use and expire after validation
