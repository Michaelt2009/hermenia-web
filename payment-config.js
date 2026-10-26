// ============================================================================
// CONFIGURACIÓN CENTRAL DE PASARELAS DE PAGO Y VENTAS - HERMENIA
// ============================================================================
// ⚠️ REGLA DE SEGURIDAD ABSOLUTA:
// En este archivo SOLO se colocan Llaves Públicas (Public Keys) o Client IDs.
// NUNCA coloques llaves privadas (Secret Keys, Access Tokens o contraseñas).
// Las llaves secretas se configuran de forma segura y oculta en Vercel.
// ============================================================================

window.HERMENIA_PAYMENTS = {
  // 1. MERCADO PAGO (Colombia & Latinoamérica: PSE, Nequi, Daviplata, Tarjetas COP)
  // Cuando tengas tus credenciales, pega tu Llave Pública aquí (empieza por TEST- o APP_USR-):
  MERCADOPAGO_PUBLIC_KEY: "BAAiZdjj4_reY1tqeoFktJ7QF80KO5Q8rtn33UIltvCVuoRzVqtEvLDN0SMbMfIbIurfi6kGF5LhkJ3HWk",

  // 2. PAYPAL DEVELOPER (Internacional / Pagos en Dólares USD de cualquier país)
  // Cuando tengas tus credenciales, pega tu Client ID de PayPal aquí:
  PAYPAL_CLIENT_ID: "",

  // 3. WHATSAPP OFICIAL DE HERMENIA (Para venta asistida, transferencias directas y soporte)
  WHATSAPP_NUMERO: "573161492880",

  // 4. MODO DE PRUEBAS (true = pruebas con tarjetas simuladas; false = cobro con dinero real)
  MODO_PRUEBAS: true,

  // 5. CATÁLOGO DE PLANES OFICIALES Y PRECIOS
  PLANES: {
    prueba_15_dias: {
      id: "prueba_15_dias",
      nombre: "Prueba Pro 15 Días",
      precioUSD: 0,
      precioCOP: 0,
      periodo: "15 días",
      descripcion: "Acceso total sin tarjeta de crédito para evaluación pastoral.",
      esGratis: true
    },
    mensual: {
      id: "mensual",
      nombre: "Licencia Mensual",
      precioUSD: 10,
      precioCOP: 41000,
      periodo: "mes",
      descripcion: "Suscripción flexible mes a mes con todas las funciones e IA.",
      esGratis: false
    },
    semestral: {
      id: "semestral",
      nombre: "Licencia Semestral",
      precioUSD: 50,
      precioCOP: 205000,
      periodo: "semestre",
      descripcion: "Ideal para semestres de seminario o institutos bíblicos.",
      esGratis: false
    },
    anual: {
      id: "anual",
      nombre: "Licencia Pro Anual",
      precioUSD: 100,
      precioCOP: 410000,
      periodo: "año",
      descripcion: "La elección predilecta de pastores. Ahorra 17% con soporte prioritario.",
      esGratis: false
    },
    vitalicia: {
      id: "vitalicia",
      nombre: "Licencia Vitalicia Definitiva",
      precioUSD: 250,
      precioCOP: 1025000,
      periodo: "pago único",
      descripcion: "Inversión definitiva de por vida. Cero pagos futuros y canal VIP.",
      esGratis: false
    }
  }
};
