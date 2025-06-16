const scheduledSessionService = require('../services/scheduledSessionService');

class ScheduledSessionController {
  async createSession(req, res, next) {
    try {
      const { branchId } = req.params; // يفترض أن يأتي من المسار المتداخل
      const sessionData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!branchId) { // تحقق إضافي هنا
        return res.status(400).json({ message: 'Branch ID is required to create a session.' });
      }

      const newSession = await scheduledSessionService.createSession(sessionData, branchId, requestingUserId, userRole);
      res.status(201).json(newSession);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('must be') || error.message.includes('Invalid') || error.message.includes('does not belong')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAllSessions(req, res, next) {
    try {
      // الفلاتر يمكن أن تأتي من req.query أو req.params إذا كان المسار متداخلاً
      const filters = { ...req.query, ...req.params };
      // إزالة gymId من الفلاتر إذا كان موجودًا في params (لأنه سيتم التعامل معه بشكل خاص في الخدمة)
      // أو التأكد من أن الخدمة تتعامل معه بشكل صحيح إذا جاء من params و query
      if (req.params.gymId) filters.gymId = req.params.gymId;
      if (req.params.branchId) filters.branchId = req.params.branchId;


      const sessions = await scheduledSessionService.getAllSessions(filters);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await scheduledSessionService.getSessionById(sessionId);
      res.json(session);
    } catch (error) {
      if (error.message === 'Scheduled session not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async updateSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const sessionData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (Object.keys(sessionData).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
      }

      const updatedSession = await scheduledSessionService.updateSession(sessionId, sessionData, requestingUserId, userRole);
      res.json(updatedSession);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('cannot be less than current booked capacity') || error.message.includes('is not compatible')) {
        return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
      }
      if (error.message.includes('required') || error.message.includes('must be') || error.message.includes('Invalid')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async deleteSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const result = await scheduledSessionService.deleteSession(sessionId, requestingUserId, userRole);
      res.json(result);
    } catch (error) {
      if (error.message === 'Scheduled session not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
       if (error.message.includes('cancelled as it had bookings')) {
        return res.status(200).json({ message: error.message }); // أو 400 إذا كنت تعتبره خطأ
      }
      next(error);
    }
  }
}

module.exports = new ScheduledSessionController();
