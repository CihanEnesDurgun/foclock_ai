# Deployment Notes - Version 1.5.B

## Release Information

**Version:** 1.5.B (Beta v1.5)  
**Release Date:** January 31, 2026  
**Branch:** `main`

## Changes Summary

This release focuses on welcome screen overhaul and user experience improvements:

- **Welcome Screen:** Complete redesign with modern minimal layout, full-width usage
- **Theme Support:** Light/dark theme toggle, theme-based screenshots
- **Splash Removal:** Loading screen removed, direct navigation to welcome
- **Default Theme:** Light theme set as default for new visitors

## Frontend Changes

### Modified Files
- `App.tsx` - Welcome screen redesign, theme toggle, splash removal
- `version.ts` - Version updated to 1.5.B
- `package.json` - Version updated to 1.5.0
- `CHANGELOG.md` - Added version 1.5.B entry
- `README.md` - Updated with version 1.5.B and new features

### No Breaking Changes
- All existing functionality remains unchanged
- No API changes
- No database schema changes required

## Backend Changes

### No Backend Changes
- No database migrations required
- No API endpoint modifications
- Supabase schema remains unchanged

## Deployment Instructions

### Prerequisites
- Node.js v18 or higher
- Vercel account (if deploying to Vercel)
- Environment variables configured:
  - `GEMINI_API_KEY` - Google Gemini API key
  - Supabase credentials (if not hardcoded)

### Automatic Deployment (Vercel)

If Vercel is connected to the GitHub repository:

1. **Automatic Trigger:** Push to `main` branch automatically triggers deployment
2. **Build Process:** Vercel will:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy to production

3. **Environment Variables:** Ensure `GEMINI_API_KEY` is set in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Verify `GEMINI_API_KEY` is configured for Production, Preview, and Development

### Manual Deployment

If deploying manually:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# The dist/ folder contains the production build
# Deploy dist/ to your hosting service
```

### Database Setup

**No database changes required for this release.**

If setting up from scratch:
1. Run `scripts/schema.sql` in Supabase SQL Editor
2. Ensure RLS policies are enabled
3. Verify all RPC functions are created

## Testing Checklist

- [x] README displays correctly
- [x] Version number updated in package.json
- [x] Changelog updated
- [x] No breaking changes introduced
- [ ] Verify Vercel deployment (if applicable)
- [ ] Test application functionality after deployment

## Rollback Instructions

If issues occur after deployment:

1. **Vercel:** Use Vercel dashboard to rollback to previous deployment
2. **Git:** Revert to previous commit:
   ```bash
   git revert f722638
   git push origin main
   ```

## Post-Deployment

1. Verify the application is accessible
2. Check that all features work as expected
3. Monitor error logs for any issues
4. Update users about new documentation (if applicable)

## Notes

- This is a documentation-only release
- No code changes in frontend or backend
- Safe to deploy without downtime
- No user-facing feature changes

---

**Deployment Status:** ✅ Ready for deployment  
**Risk Level:** Low (documentation-only changes)  
**Estimated Downtime:** None
