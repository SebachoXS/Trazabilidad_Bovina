import { test, expect } from '@playwright/test';

test.describe('Módulo de Animales', () => {
  test('debe cargar el formulario de nuevo animal', async ({ page }) => {
    // Interceptar la API para simular llamadas exitosas
    await page.route('**/api/v1/animales/madres', route => route.fulfill({ status: 200, json: { data: [] } }));
    await page.route('**/api/v1/animales/padres', route => route.fulfill({ status: 200, json: { data: [] } }));

    // Inyectar estado de autenticación en Zustand (localStorage)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          token: 'fake-token',
          user: { id: 1, email: 'admin@test.com', rol: 'ADMIN', nombre: 'Admin' },
          isAuthenticated: true
        },
        version: 0
      }));
    });

    // Ahora sí vamos a la ruta protegida
    await page.goto('/animales/nuevo');
    
    // Verificar que el título sea correcto
    await expect(page.getByRole('heading', { name: /Registrar Animal/i, level: 1 })).toBeVisible();
    
    // Verificar inputs críticos (RN-001: Código Visual)
    await expect(page.locator('input[name="codigoVisual"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Guardar Bovino/i })).toBeVisible();
  });
});
