import { test, expect } from '@playwright/test';

test.describe('Autenticación y Login', () => {
  test('debe cargar la pantalla de login', async ({ page }) => {
    // Ir a la ruta de login
    await page.goto('/login');

    // Verificar que estamos en la pantalla de inicio de sesión
    await expect(page.locator('h1')).toHaveText(/Trazabilidad Bovina/i);
    
    // Verificar que existen los inputs de email y password
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Verificar botón
    const loginBtn = page.getByRole('button', { name: /Ingresar/i });
    await expect(loginBtn).toBeVisible();
  });
});
