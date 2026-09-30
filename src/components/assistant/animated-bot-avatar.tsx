'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedBotAvatarProps {
  size?: number
  className?: string
  isThinking?: boolean
  interactive?: boolean
}

export function AnimatedBotAvatar({
  size = 32,
  className = '',
  isThinking = false,
  interactive = true,
}: AnimatedBotAvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-300',
        interactive && 'hover:scale-110 active:scale-95 group',
        className
      )}
      style={{ width: size, height: size }}
      aria-label="Asistente IA"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-sm"
      >
        {/* Cuerpo / Cabeza flotante con animación continua a 60fps */}
        <g className={cn('animate-bot-float', isThinking && 'animate-pulse')}>
          {/* Antena con oscilación suave y luz pulsante */}
          <g className="animate-bot-antenna">
            <line
              x1="32"
              y1="14"
              x2="32"
              y2="7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-emerald-400/80 dark:text-emerald-400"
            />
            <circle
              cx="32"
              cy="6"
              r="3.5"
              className="fill-emerald-400 animate-bot-antenna-glow"
            />
          </g>

          {/* Pernos / Orejas metálicas laterales */}
          <rect
            x="8"
            y="26"
            width="4.5"
            height="13"
            rx="2.25"
            className="fill-emerald-600/70 dark:fill-emerald-500/60"
          />
          <rect
            x="51.5"
            y="26"
            width="4.5"
            height="13"
            rx="2.25"
            className="fill-emerald-600/70 dark:fill-emerald-500/60"
          />

          {/* Chasis exterior de la cabeza (Squircle redondeado) */}
          <rect
            x="11.5"
            y="13.5"
            width="41"
            height="38"
            rx="13"
            className="fill-slate-900/90 dark:fill-slate-800 stroke-emerald-500/40"
            strokeWidth="2"
          />

          {/* Visor / Pantalla digital interna brillante */}
          <rect
            x="15"
            y="17"
            width="34"
            height="30"
            rx="9"
            fill="#061210"
            stroke="rgba(52, 211, 153, 0.3)"
            strokeWidth="1"
          />

          {/* Brillo especular superior del visor */}
          <path
            d="M 19 21.5 Q 32 24.5 45 21.5"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.28"
          />

          {/* Grupo de Expresión Facial (Mirada, Parpadeos y Muecas) */}
          <g className="animate-bot-look">
            {/* Mejillas sonrojadas que se iluminan al sonreír */}
            <ellipse
              cx="20"
              cy="39"
              rx="2.4"
              ry="1.3"
              className="fill-emerald-400 animate-bot-cheeks"
            />
            <ellipse
              cx="44"
              cy="39"
              rx="2.4"
              ry="1.3"
              className="fill-emerald-400 animate-bot-cheeks"
            />

            {/* Ojo Izquierdo: Parpadeo natural fluido + doble parpadeo */}
            <g className="animate-bot-eye-left">
              <rect
                x="21.5"
                y="27"
                width="6"
                height="9.5"
                rx="3"
                fill="#34d399"
                style={{
                  filter: 'drop-shadow(0 0 3px rgba(52, 211, 153, 0.95))',
                }}
              />
              {/* Brillo en pupila izquierda */}
              <circle cx="23.5" cy="29.5" r="1.3" fill="white" opacity="0.95" />
            </g>

            {/* Ojo Derecho: Parpadeo sincronizado + ¡MUECA DE GUIÑO! */}
            <g className="animate-bot-eye-right">
              <rect
                x="36.5"
                y="27"
                width="6"
                height="9.5"
                rx="3"
                fill="#34d399"
                style={{
                  filter: 'drop-shadow(0 0 3px rgba(52, 211, 153, 0.95))',
                }}
              />
              {/* Brillo en pupila derecha */}
              <circle cx="38.5" cy="29.5" r="1.3" fill="white" opacity="0.95" />
            </g>

            {/* Boca digital que sonríe y reacciona */}
            <path
              d="M 28.5 40.5 Q 32 44 35.5 40.5"
              stroke="#34d399"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              className="animate-bot-mouth"
              style={{
                filter: 'drop-shadow(0 0 2.5px rgba(52, 211, 153, 0.9))',
              }}
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
