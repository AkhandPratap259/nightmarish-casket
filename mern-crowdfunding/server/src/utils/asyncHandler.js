// Express 4 does not forward rejected promises from async route handlers
// to the error middleware, so wrap every async handler with this.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
