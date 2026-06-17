const escapeRegex = (string) => string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
module.exports = { escapeRegex };
