import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import type { Order } from '../types';
import { Trophy, Crown, TrendingUp, Calendar } from 'lucide-react';

interface RankEntry {
  clientId: string;
  clientName: string;
  totalSpent: number;
  orderCount: number;
}

/** Retorna el timestamp (ms) del lunes de la semana actual a las 00:00:00 */
function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  // Queremos que la semana empiece el Lunes
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/** Retorna el timestamp (ms) del viernes de la semana actual a las 23:59:59 */
function getWeekEnd(): number {
  const start = getWeekStart();
  const friday = new Date(start);
  friday.setDate(new Date(start).getDate() + 4); // Lunes + 4 = Viernes
  friday.setHours(23, 59, 59, 999);
  return friday.getTime();
}

function formatDateRange(): string {
  const start = new Date(getWeekStart());
  const end = new Date(getWeekEnd());
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('es-CO', opts)} – ${end.toLocaleDateString('es-CO', opts)}`;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_BG = ['rgba(255,215,0,0.12)', 'rgba(192,192,192,0.12)', 'rgba(205,127,50,0.12)'];

export const WeeklyRanking: React.FC = () => {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { clients, user } = useStore();

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  const isWeekend = [0, 6].includes(new Date().getDay()); // Sábado o Domingo

  useEffect(() => {
    // Escuchar pedidos pagados dentro de la semana actual (Lunes a Viernes)
    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', weekStart),
      where('createdAt', '<=', weekEnd)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];

      // Agrupar por cliente y sumar totales (contamos todos los pedidos, pagados y pendientes)
      const map: Record<string, { totalSpent: number; orderCount: number }> = {};
      orders.forEach(order => {
        if (!map[order.clientId]) {
          map[order.clientId] = { totalSpent: 0, orderCount: 0 };
        }
        map[order.clientId].totalSpent += order.total;
        map[order.clientId].orderCount += 1;
      });

      // Construir lista con nombres
      const list: RankEntry[] = Object.entries(map).map(([clientId, data]) => {
        const client = clients.find(c => c.uid === clientId);
        const clientName = client ? client.name : (clientId === user?.uid ? (user?.name || 'Tú') : 'Cliente');
        return { clientId, clientName, ...data };
      });

      // Ordenar de mayor a menor
      list.sort((a, b) => b.totalSpent - a.totalSpent);
      setRanking(list);
      setLoading(false);
    }, (err) => {
      console.error('WeeklyRanking error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [clients, user, weekStart, weekEnd]);

  const isAtLeastAdmin = user?.role === 'admin' || user?.role === 'superuser';

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #009fe3 0%, #002d4b 100%)',
        borderRadius: 'var(--radius)',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        boxShadow: '0 4px 16px rgba(0,159,227,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '0.5rem',
            display: 'flex',
          }}>
            <Trophy size={22} color="#FFD700" />
          </div>
          <div>
            <h2 style={{ color: 'white', fontWeight: '900', fontSize: '1rem', margin: 0 }}>
              🏆 Top Compradores
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', margin: 0 }}>
              Ranking semanal · Lunes a Viernes
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '8px',
          padding: '0.3rem 0.65rem',
        }}>
          <Calendar size={13} color="rgba(255,255,255,0.8)" />
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: '700' }}>
            {formatDateRange()}
          </span>
        </div>
      </div>

      {/* Weekend message */}
      {isWeekend && (
        <div style={{
          background: 'var(--surface)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          marginBottom: '0.75rem',
        }}>
          <TrendingUp size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '700' }}>Es fin de semana 🎉</p>
          <p style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
            El ranking reinicia el próximo <strong>lunes</strong>. Aquí se mostrará la semana que viene.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Cargando ranking...
        </div>
      )}

      {/* Empty state */}
      {!loading && ranking.length === 0 && !isWeekend && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <Trophy size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.2 }} />
          <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>Aún no hay compras esta semana</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            El ranking se llenará a medida que los clientes compren.
          </p>
        </div>
      )}

      {/* Ranking List */}
      {!loading && ranking.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {ranking.map((entry, index) => {
            const isTop3 = index < 3;
            const isMe = entry.clientId === user?.uid;
            const medalColor = MEDAL_COLORS[index] ?? 'var(--text-muted)';
            const medalBg = MEDAL_BG[index] ?? 'transparent';

            return (
              <div
                key={entry.clientId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: isMe
                    ? 'rgba(0,159,227,0.08)'
                    : isTop3
                      ? medalBg
                      : 'var(--surface)',
                  border: isMe
                    ? '1.5px solid var(--primary)'
                    : isTop3
                      ? `1.5px solid ${medalColor}44`
                      : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem 1rem',
                  transition: 'transform 0.15s',
                  boxShadow: isTop3 ? `0 4px 12px ${medalColor}20` : 'var(--shadow)',
                }}
              >
                {/* Posición */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isTop3 ? `${medalColor}22` : 'var(--background)',
                  border: `2px solid ${isTop3 ? medalColor : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: '900',
                  fontSize: '0.75rem',
                  color: isTop3 ? medalColor : 'var(--text-muted)',
                }}>
                  {index === 0 ? <Crown size={18} color={medalColor} /> : `#${index + 1}`}
                </div>

                {/* Nombre */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    color: isMe ? 'var(--primary)' : 'var(--text)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {entry.clientName}
                    {isMe && <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', color: 'var(--primary)', fontWeight: '700' }}>· TÚ</span>}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                    {entry.orderCount} pedido{entry.orderCount !== 1 ? 's' : ''} esta semana
                    {isAtLeastAdmin && <span style={{ marginLeft: '0.25rem' }}>· {entry.clientId.slice(0, 6)}</span>}
                  </p>
                </div>

                {/* Total */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontWeight: '900',
                    fontSize: '1rem',
                    color: isTop3 ? medalColor : 'var(--text)',
                    margin: 0,
                  }}>
                    ${entry.totalSpent.toLocaleString('es-CO')}
                  </p>
                  {isTop3 && (
                    <div style={{ fontSize: '0.65rem', color: medalColor, fontWeight: '700', marginTop: '0.1rem' }}>
                      {index === 0 ? '🥇 1er lugar' : index === 1 ? '🥈 2do lugar' : '🥉 3er lugar'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
