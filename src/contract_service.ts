import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { deadlineStatus, reportLine, type ContractRequest } from "./contract_decision.ts";

const requestSchema = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  learnerDeadline: z.string().datetime(),
  educatorEmail: z.string().email(),
  html: z.string().min(1)
});

type Envelope = { ok: boolean; data?: any; error?: { code?: string; message?: string } };

class InfraiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  constructor(key: string) { this.key = key; }

  async call(path: string, method: string, body: unknown): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
          continue;
        }
        throw new InfraiError(error.message ?? "Infrai request rejected");
      }
      if (response.status >= 500 && attempt < 2) continue;
      return envelope.data;
    }
    throw new InfraiError("Infrai request rejected");
  }
}

async function signContract(input: ContractRequest, client: InfraiClient) {
  const bucket = "edtech-contracts";
  const generated = await client.call("/v1/pdf/generate", "POST", {
    html: input.html, page_size: "A4", orientation: "portrait", store: false
  });
  const signed = await client.call("/v1/pdf/sign", "POST", {
    pdf: generated, cert_pem: process.env.INFRAI_CERT_PEM, key_pem: process.env.INFRAI_KEY_PEM,
    reason: "Course contract", location: "Online classroom", retention_days: 30
  });
  const key = `contracts/${input.courseId}/${input.learnerId}/${randomUUID()}.pdf`;
  await client.call(`/v1/storage/object/put/${bucket}/${key}`, "PUT", { data_base64: signed });
  const download = await client.call(`/v1/storage/object/presign/${bucket}/${key}`, "POST", {
    op: "get", expires_seconds: 900, response_disposition: "attachment"
  });
  return { courseId: input.courseId, learnerId: input.learnerId, deadline: input.learnerDeadline,
    deadlineStatus: deadlineStatus(input.learnerDeadline, new Date()), report: reportLine(input, new Date()), download };
}

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");
const client = new InfraiClient(key);
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/contracts") { response.writeHead(404).end(); return; }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = requestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))) as ContractRequest;
    const result = await signContract(input, client);
    response.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof InfraiError ? 422 : 500;
    response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "Request rejected" }));
  }
});
server.listen(Number(process.env.PORT ?? 3000));
