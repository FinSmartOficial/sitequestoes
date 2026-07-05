import { createServerFn } from "@tanstack/react-start";

interface GerarExplicacaoInput {
  questao_id: string;
  forcar?: boolean;
}

function validateGerarExplicacaoInput(input: unknown): GerarExplicacaoInput {
  if (input == null || typeof input !== "object") {
    throw new Error("Payload inválido para gerar explicação.");
  }

  const payload = input as Record<string, unknown>;
  const questaoId = payload.questao_id;

  if (typeof questaoId !== "string" || questaoId.trim().length === 0) {
    throw new Error("questao_id é obrigatório para gerar explicação.");
  }

  return {
    questao_id: questaoId,
    forcar: typeof payload.forcar === "boolean" ? payload.forcar : false,
  };
}

export const gerarExplicacao = createServerFn({ method: "POST" })
  .inputValidator(validateGerarExplicacaoInput)
  .handler(async () => undefined);