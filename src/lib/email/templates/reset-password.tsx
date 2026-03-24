import * as React from 'react'

interface ResetPasswordEmailProps {
  resetUrl: string
  expiresInHours?: number
}

export function ResetPasswordEmail({
  resetUrl,
  expiresInHours = 1,
}: ResetPasswordEmailProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Redefinir senha — SAMI
      </h1>
      <p style={{ color: '#555', marginBottom: '24px' }}>
        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
      </p>
      <a
        href={resetUrl}
        style={{
          display: 'inline-block',
          backgroundColor: '#09090b',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          marginBottom: '24px',
        }}
      >
        Redefinir senha
      </a>
      <p style={{ color: '#888', fontSize: '14px' }}>
        Este link expira em {expiresInHours} hora{expiresInHours !== 1 ? 's' : ''}. Se você não solicitou a redefinição, ignore este email.
      </p>
      <p style={{ color: '#aaa', fontSize: '12px', marginTop: '16px' }}>
        Se o botão não funcionar, copie e cole este link no navegador:{' '}
        <span style={{ wordBreak: 'break-all' }}>{resetUrl}</span>
      </p>
    </div>
  )
}
