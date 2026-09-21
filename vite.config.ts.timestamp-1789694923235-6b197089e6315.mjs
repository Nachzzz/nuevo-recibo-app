// vite.config.ts
import { defineConfig } from "file:///D:/Herramientas%20Memory/nuevo-recibo-app/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Herramientas%20Memory/nuevo-recibo-app/node_modules/@vitejs/plugin-react/dist/index.js";
import electron from "file:///D:/Herramientas%20Memory/nuevo-recibo-app/node_modules/vite-plugin-electron/dist/index.mjs";
import electronRenderer from "file:///D:/Herramientas%20Memory/nuevo-recibo-app/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron"
          }
        }
      },
      {
        entry: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron"
          }
        }
      }
    ]),
    electronRenderer()
  ],
  base: "./",
  build: {
    outDir: "dist"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxIZXJyYW1pZW50YXMgTWVtb3J5XFxcXG51ZXZvLXJlY2liby1hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEhlcnJhbWllbnRhcyBNZW1vcnlcXFxcbnVldm8tcmVjaWJvLWFwcFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovSGVycmFtaWVudGFzJTIwTWVtb3J5L251ZXZvLXJlY2liby1hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uJ1xuaW1wb3J0IGVsZWN0cm9uUmVuZGVyZXIgZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXInXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGVsZWN0cm9uKFtcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9wcmVsb2FkLnRzJyxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdKSxcbiAgICBlbGVjdHJvblJlbmRlcmVyKCksXG4gIF0sXG4gIGJhc2U6ICcuLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1MsU0FBUyxvQkFBb0I7QUFDNVUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sY0FBYztBQUNyQixPQUFPLHNCQUFzQjtBQUU3QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUDtBQUFBLFFBQ0UsT0FBTztBQUFBLFFBQ1AsTUFBTTtBQUFBLFVBQ0osT0FBTztBQUFBLFlBQ0wsUUFBUTtBQUFBLFVBQ1Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLE9BQU87QUFBQSxRQUNQLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxVQUNWO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELGlCQUFpQjtBQUFBLEVBQ25CO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
