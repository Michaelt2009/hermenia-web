// ============================================================================
// WEBHOOK PAYPAL - ACTIVACIÓN AUTOMÁTICA DE LICENCIAS HERMENIA
// ============================================================================
// Endpoint: POST /api/webhook-paypal
// Este archivo se ejecuta en los servidores seguros de Vercel.
// Utiliza las variables PAYPAL_CLIENT_ID y PAYPAL_SECRET_KEY configuradas en Vercel.
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook activo de Hermenia para PayPal' });
  }

  try {
    const body = req.body || {};
    const eventType = body.event_type;

    console.log(`[PayPal Webhook] Evento recibido: ${eventType}`);

    // Procesar eventos de pago completado
    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED' && eventType !== 'CHECKOUT.ORDER.APPROVED') {
      return res.status(200).json({ status: 'ignored', message: 'Evento no procesable directamente' });
    }

    const resource = body.resource || {};
    const email = (resource.payer?.email_address || resource.custom_id || '').toLowerCase().trim();
    const planId = resource.custom_id || 'vitalicia';
    const payerName = [resource.payer?.name?.given_name, resource.payer?.name?.surname].filter(Boolean).join(' ') || 'Pastor / Investigador';
    const transactionId = resource.id || body.id;

    if (!email) {
      console.warn('[PayPal Webhook] Pago recibido pero sin correo del comprador.');
      return res.status(200).json({ status: 'warning', message: 'Sin correo' });
    }

    // Calcular vencimiento
    const ahora = new Date();
    let fechaVence = null;
    if (planId === 'mensual') {
      ahora.setDate(ahora.getDate() + 30);
      fechaVence = ahora.toISOString();
    } else if (planId === 'semestral') {
      ahora.setDate(ahora.getDate() + 180);
      fechaVence = ahora.toISOString();
    } else if (planId === 'anual') {
      ahora.setDate(ahora.getDate() + 365);
      fechaVence = ahora.toISOString();
    } else {
      fechaVence = '2099-12-31T23:59:59.000Z';
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://zukprpbsyycoxorkscfn.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_qlj0XZ-T68FxroJ8ILq7cQ_8N444yW8';

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const claveLicencia = `LIC-PP-${planId.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error: upsertErr } = await supabase.from('usuarios_registrados').upsert({
      email: email,
      nombre: payerName,
      licencia_tipo: planId,
      licencia_activa: true,
      licencia_key: claveLicencia,
      estado: 'activo',
      fecha_vencimiento: fechaVence,
      metodo_pago: 'paypal',
      transaccion_id: String(transactionId),
      fecha_actualizacion: new Date().toISOString()
    }, { onConflict: 'email' });

    if (upsertErr) {
      console.error('[PayPal Webhook] Error en Supabase upsert:', upsertErr);
    } else {
      console.log(`[PayPal Webhook] ✅ Licencia ${planId} activada exitosamente para: ${email}`);
    }

    return res.status(200).json({
      status: 'success',
      email,
      plan: planId,
      transactionId
    });

  } catch (err) {
    console.error('[PayPal Webhook] Error inesperado:', err);
    return res.status(200).json({ status: 'error', error: err.message });
  }
}
