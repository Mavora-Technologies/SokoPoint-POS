import { Request, Response } from 'express';
import { db } from '../../db';
import { supportTickets } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export class SupportController {
  
  // GET /api/v1/support/tickets - Fetch tickets for the logged-in tenant
  static async getTickets(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required' });

      const allTickets = await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.tenantId, tenantId))
        .orderBy(desc(supportTickets.createdAt));

      return res.status(200).json({ success: true, data: allTickets });
    } catch (error: any) {
      console.error('[SUPPORT GET]', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch tickets' });
    }
  }

  // POST /api/v1/support/tickets - Open a new ticket
  static async createTicket(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required' });

      const { subject, description, priority } = req.body;
      
      if (!subject || !description) {
        return res.status(400).json({ success: false, message: 'Subject and description are required' });
      }

      // Generate a simple readable ticket number (e.g., TKT-1698239021)
      const ticketNumber = `TKT-${Math.floor(Date.now() / 1000)}`;

      const [newTicket] = await db.insert(supportTickets).values({
        tenantId,
        ticketNumber,
        subject,
        description,
        priority: priority || 'MEDIUM',
        status: 'PENDING'
      }).returning();

      return res.status(201).json({ success: true, message: 'Ticket submitted successfully', data: newTicket });
    } catch (error: any) {
      console.error('[SUPPORT POST]', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to submit ticket' });
    }
  }
}