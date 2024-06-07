import retry from "async-retry";

async function waitForAllServices() {
  await waitForWebServer();
}

async function waitForWebServer() {
  return retry(fatchStatusPage, {
    retries: 100,
    maxTimeout: 1000,
  });

  async function fatchStatusPage() {
    const response = await fetch("http://localhost:3000/api/v1/status");
    const responseBody = await response.json();
  }
}
export default {
  waitForAllServices,
};
