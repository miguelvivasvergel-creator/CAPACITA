// Estado visual de desarrollo; nunca se usa como fallback de una respuesta real.
export const candidatoDeEjemplo = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  provider: 'gemini',
  model: 'modelo-de-ejemplo',
  manifest: {
    status: 'draft', implementation_verified: false,
    artifact_hash: '0'.repeat(64),
    proposal: { source: 'def run(inputs, parameters):\n    return {"resultado": inputs["texto"].strip()}\n', dependencies: [] },
  },
};
