'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KitchenOrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes?: string;
}

interface KitchenTicket {
  orderId: string;
  tableNumber: string;
  createdAt: string;
  status: 'PREPARING' | 'READY';
  items: KitchenOrderItem[];
}

export default function KitchenDisplaySystem() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);

  useEffect(() => {
    fetchKitchenTickets();
    const interval = setInterval(fetchKitchenTickets, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenTickets = async () => {
    try {
      const res = await api.get('/orders?status=PREPARING');
      setTickets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'READY' });
      await fetchKitchenTickets();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update order status');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kitchen Display System (KDS)</h1>
          <p className="text-sm text-slate-400">Live active kitchen order routing queue.</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-200" onClick={fetchKitchenTickets}>
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500">
            No active kitchen orders pending preparation.
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.orderId}
              className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                  <span className="text-lg font-bold text-amber-400">
                    Table: {ticket.tableNumber}
                  </span>
                  <Badge variant="secondary">{new Date(ticket.createdAt).toLocaleTimeString()}</Badge>
                </div>

                <div className="space-y-2">
                  {ticket.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <span className="font-semibold text-slate-100">
                        {item.quantity}x {item.productName}
                      </span>
                      {item.notes && (
                        <span className="text-xs text-amber-300 italic">{item.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                onClick={() => handleMarkReady(ticket.orderId)}
              >
                Mark Order Ready
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}