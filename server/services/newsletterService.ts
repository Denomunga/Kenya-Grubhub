import { Newsletter } from "../models/Newsletter";
import nodemailer from "nodemailer";

export interface NotificationData {
  type: 'specialOffers' | 'newProducts' | 'events' | 'news';
  subject: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
}

export class NewsletterService {
  private static transporter: nodemailer.Transporter | null = null;

  static initializeTransporter() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: !!process.env.SMTP_SECURE,
        auth: process.env.SMTP_USER ? { 
          user: process.env.SMTP_USER, 
          pass: process.env.SMTP_PASS 
        } : undefined,
      });
    }
  }

  static async sendNotification(data: NotificationData): Promise<void> {
    try {
      // Initialize transporter if not already done
      if (!this.transporter) {
        this.initializeTransporter();
      }

      // Get all active subscribers who have opted in for this type of notification
      const subscribers = await Newsletter.find({ 
        isActive: true,
        [`preferences.${data.type}`]: true
      });

      if (subscribers.length === 0) {
        console.log(`No subscribers found for ${data.type} notifications`);
        return;
      }

      // Prepare email content
      const emailHtml = this.generateEmailTemplate(data);
      const emailText = this.generateTextTemplate(data);

      // Send emails
      const emailPromises = subscribers.map(async (subscriber) => {
        try {
          if (this.transporter) {
            await this.transporter.sendMail({
              from: process.env.SMTP_FROM || 'noreply@wathii.co.ke',
              to: subscriber.email,
              subject: data.subject,
              text: emailText,
              html: emailHtml,
            });
            console.log(`Newsletter sent to ${subscriber.email} for ${data.type}`);
          } else {
            console.log(`[DEV MODE] Would send newsletter to ${subscriber.email}: ${data.subject}`);
          }
        } catch (error) {
          console.error(`Failed to send newsletter to ${subscriber.email}:`, error);
        }
      });

      await Promise.allSettled(emailPromises);
      console.log(`Newsletter campaign completed: ${data.subject} (${subscribers.length} recipients)`);

    } catch (error) {
      console.error('Newsletter service error:', error);
      throw error;
    }
  }

  private static generateEmailTemplate(data: NotificationData): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://wathii.co.ke';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌟 WATHII Newsletter</h1>
        <p>Discover the Style of Kenya</p>
    </div>
    
    <div class="content">
        <h2>${data.subject}</h2>
        
        ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.subject}" />` : ''}
        
        <div>${data.content}</div>
        
        ${data.linkUrl ? `<a href="${data.linkUrl}" class="button">Learn More</a>` : ''}
        
        <p>Thank you for being part of the WATHII community!</p>
    </div>
    
    <div class="footer">
        <p>&copy; 2024 WATHII. All rights reserved.</p>
        <p>You received this email because you subscribed to our newsletter.</p>
        <p><a href="${baseUrl}/unsubscribe">Unsubscribe</a></p>
    </div>
</body>
</html>`;
  }

  private static generateTextTemplate(data: NotificationData): string {
    return `
WATHII Newsletter - ${data.subject}

${data.content}

${data.linkUrl ? `Learn more: ${data.linkUrl}` : ''}

Thank you for being part of the WATHII community!

---
© 2024 WATHII. All rights reserved.
You received this email because you subscribed to our newsletter.
Unsubscribe: ${process.env.FRONTEND_URL || 'https://wathii.co.ke'}/unsubscribe
    `;
  }

  static async getSubscriberCount(): Promise<number> {
    return await Newsletter.countDocuments({ isActive: true });
  }

  static async getSubscribersByPreference(): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { isActive: true } },
      { $group: {
        _id: null,
        specialOffers: { $sum: { $cond: ['$preferences.specialOffers', 1, 0] } },
        newProducts: { $sum: { $cond: ['$preferences.newProducts', 1, 0] } },
        events: { $sum: { $cond: ['$preferences.events', 1, 0] } },
        news: { $sum: { $cond: ['$preferences.news', 1, 0] } }
      }}
    ];

    const result = await Newsletter.aggregate(pipeline);
    return result[0] || {
      specialOffers: 0,
      newProducts: 0,
      events: 0,
      news: 0
    };
  }
}
