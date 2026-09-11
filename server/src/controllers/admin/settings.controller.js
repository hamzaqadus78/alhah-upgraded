const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');

const VALID_SCOPES = ['shop', 'admin'];
const VALID_FONTS = ['dm-sans', 'inter', 'poppins', 'montserrat', 'ibm-plex-sans'];
const VALID_MODES = ['light', 'dark'];
const VALID_SHAPES = ['sharp', 'rounded', 'pill'];
const VALID_FILLS = ['solid', 'outline', 'gradient'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const DEFAULTS = {
  shop: { fontKey: 'dm-sans', accentColor: '#006D77', accentColor2: '#00C49A', defaultMode: 'light', allowToggle: true, buttonShape: 'rounded', buttonFill: 'solid' },
  admin: { fontKey: 'dm-sans', accentColor: '#6366f1', accentColor2: '#818cf8', defaultMode: 'dark', allowToggle: true, buttonShape: 'rounded', buttonFill: 'solid' },
};

function validateScope(scope) {
  if (!VALID_SCOPES.includes(scope)) throw new HttpError(400, `scope must be one of: ${VALID_SCOPES.join(', ')}`);
}

// Public — appearance settings aren't sensitive, and admin-login.html needs
// to read the "admin" scope before the visitor has logged in at all.
async function getSettings(req, res, next) {
  try {
    const { scope } = req.params;
    validateScope(scope);
    const row = await prisma.siteSettings.findUnique({ where: { scope } });
    res.json(row || { scope, ...DEFAULTS[scope] });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { scope } = req.params;
    validateScope(scope);

    const { fontKey, accentColor, accentColor2, defaultMode, allowToggle, buttonShape, buttonFill } = req.body || {};
    const data = {};
    if (fontKey !== undefined) {
      if (!VALID_FONTS.includes(fontKey)) throw new HttpError(400, `fontKey must be one of: ${VALID_FONTS.join(', ')}`);
      data.fontKey = fontKey;
    }
    if (accentColor !== undefined) {
      if (!HEX_RE.test(accentColor)) throw new HttpError(400, 'accentColor must be a hex color like #006D77.');
      data.accentColor = accentColor;
    }
    if (accentColor2 !== undefined) {
      if (!HEX_RE.test(accentColor2)) throw new HttpError(400, 'accentColor2 must be a hex color like #00C49A.');
      data.accentColor2 = accentColor2;
    }
    if (defaultMode !== undefined) {
      if (!VALID_MODES.includes(defaultMode)) throw new HttpError(400, `defaultMode must be one of: ${VALID_MODES.join(', ')}`);
      data.defaultMode = defaultMode;
    }
    if (allowToggle !== undefined) {
      if (typeof allowToggle !== 'boolean') throw new HttpError(400, 'allowToggle must be true or false.');
      data.allowToggle = allowToggle;
    }
    if (buttonShape !== undefined) {
      if (!VALID_SHAPES.includes(buttonShape)) throw new HttpError(400, `buttonShape must be one of: ${VALID_SHAPES.join(', ')}`);
      data.buttonShape = buttonShape;
    }
    if (buttonFill !== undefined) {
      if (!VALID_FILLS.includes(buttonFill)) throw new HttpError(400, `buttonFill must be one of: ${VALID_FILLS.join(', ')}`);
      data.buttonFill = buttonFill;
    }

    const row = await prisma.siteSettings.upsert({
      where: { scope },
      create: { scope, ...DEFAULTS[scope], ...data },
      update: data,
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, VALID_FONTS, VALID_SHAPES, VALID_FILLS };
