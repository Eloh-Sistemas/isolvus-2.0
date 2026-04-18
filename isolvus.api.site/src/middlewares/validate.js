export function validate(schema, property = 'body') {
  return (req, res, next) => {
    try {
      req[property] = schema.parse(req[property]);
      next();
    } catch (err) {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: err.errors
      });
    }
  };
}
