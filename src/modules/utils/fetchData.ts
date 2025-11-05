import axios, { AxiosRequestConfig } from 'axios';

export async function httpGet<T = unknown>(url: string, config?: AxiosRequestConfig) {
  const res = await axios.get<T>(url, config);
  return res.data;
}

export async function httpPost<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const res = await axios.post<T>(url, body, config);
  return res.data;
}


