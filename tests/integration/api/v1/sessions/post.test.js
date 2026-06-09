import session from "models/session.js";
import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import webserver from "infra/webserver.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    it("With incorrect `email` but correct `password`", async () => {
      await orchestrator.createUser({
        password: "senha-correta",
      });
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.errado@curso.dev",
          password: "senha-correta",
        }),
      });

      expect(response.status).toBe(401);
      const resposeBody = await response.json();
      expect(resposeBody).toEqual({
        name: "UnauthorizedError",
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
        status_code: 401,
      });
    });
    it("With correct `email` but incorrect `password`", async () => {
      await orchestrator.createUser({
        email: "email.correto@curso.dev",
      });
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.correto@curso.dev",
          password: "senha-incorreta",
        }),
      });

      expect(response.status).toBe(401);
      const resposeBody = await response.json();
      expect(resposeBody).toEqual({
        name: "UnauthorizedError",
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
        status_code: 401,
      });
    });
    it("With incorrect `email` and incorrect `password`", async () => {
      await orchestrator.createUser();
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.incorreto@curso.dev",
          password: "senha-incorreta",
        }),
      });

      expect(response.status).toBe(401);
      const resposeBody = await response.json();
      expect(resposeBody).toEqual({
        name: "UnauthorizedError",
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
        status_code: 401,
      });
    });

    it("With correct `email` and correct `password`", async () => {
      const createdUser = await orchestrator.createUser({
        email: "tudo.correto@curso.dev",
        password: "tudocorreto",
      });
      await orchestrator.activateUser(createdUser);
      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "tudo.correto@curso.dev",
          password: "tudocorreto",
        }),
      });
      const resposeBody = await response.json();
      expect(response.status).toBe(201);

      expect(resposeBody).toEqual({
        id: resposeBody.id,
        token: resposeBody.token,
        user_id: createdUser.id,
        expires_at: resposeBody.expires_at,
        created_at: resposeBody.created_at,
        updated_at: resposeBody.updated_at,
      });
      expect(uuidVersion(resposeBody.id)).toBe(4);
      expect(Date.parse(resposeBody.expires_at)).not.toBeNaN();
      expect(Date.parse(resposeBody.created_at)).not.toBeNaN();
      expect(Date.parse(resposeBody.updated_at)).not.toBeNaN();

      // `expires_at` é calculado na aplicação antes da persistência.
      // `created_at` é calculado depois na camada do banco de dados.
      // Por isso, o tempo real entre as duas datas pode ficar ligeiramente
      // menor do que o tempo de expiração configurado e não bater 30 dias nos
      // milissegundos caso seja calculado apenas `expires_at` - `created_at`.
      // Então a ideia é garantir que no momento `expires_at` seja maior que
      // `created_at`, e também que possa existir distância de até 5 segundo
      // entre as duas datas para cobrir o caso do banco sofrer algum load
      // inesperado nos testes.

      const expiresAt = new Date(resposeBody.expires_at);
      const createdAt = new Date(resposeBody.created_at);

      expect(expiresAt >= createdAt).toBe(true);

      const actualLifetimeInMilliseconds = expiresAt - createdAt;
      const lifetimeDifferenceInMilliseconds =
        session.EXPIRATION_IN_MILLISECONDS - actualLifetimeInMilliseconds;

      expect(lifetimeDifferenceInMilliseconds).toBeLessThanOrEqual(5000);
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: resposeBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
    });
  });
});
