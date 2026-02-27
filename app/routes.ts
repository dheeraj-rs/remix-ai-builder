import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("api/ai-website-builder", "routes/api.chat.ts")
] satisfies RouteConfig;
