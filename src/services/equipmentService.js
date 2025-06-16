const { Equipment, Branch, Gym, User } = require('../models'); // استيراد النماذج اللازمة

class EquipmentService {
  async createEquipment(equipmentData, branchId, requestingUserId, userRole) {
    const { name, description, quantity, purchaseDate, condition } = equipmentData;

    const branch = await Branch.findByPk(branchId, { include: [{ model: Gym, as: 'gym' }] });
    if (!branch) {
      throw new Error('Branch not found');
    }

    // التحقق من الصلاحيات: مالك الصالة (التي يتبع لها الفرع) أو SUPER_ADMIN
    // أو لاحقًا يمكن إضافة دور مثل BRANCH_MANAGER
    if (userRole !== 'SUPER_ADMIN' && branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to add equipment to this branch.');
    }

    if (!name || quantity === undefined) {
        throw new Error('Equipment name and quantity are required.');
    }
    if (isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
        throw new Error('Quantity must be a non-negative integer.');
    }
    if (purchaseDate && isNaN(new Date(purchaseDate).getTime())) {
        throw new Error('Invalid purchase date format.');
    }

    const newEquipment = await Equipment.create({
      branchId,
      name,
      description,
      quantity: parseInt(quantity),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      condition, // e.g., 'NEW', 'USED', 'MAINTENANCE_REQUIRED'
    });
    return newEquipment;
  }

  async getAllEquipment(branchId = null) {
    const queryOptions = {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name'],
          include: [{ model: Gym, as: 'gym', attributes: ['id', 'name'] }]
        }
      ]
    };
    if (branchId) {
      queryOptions.where = { branchId };
    }
    const equipmentList = await Equipment.findAll(queryOptions);
    return equipmentList;
  }

  async getEquipmentById(equipmentId) {
    const equipment = await Equipment.findByPk(equipmentId, {
      include: [
        {
          model: Branch,
          as: 'branch',
          include: [{ model: Gym, as: 'gym', include: [{model: User, as: 'owner', attributes: ['id', 'email']}] }]
        }
      ]
    });
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    return equipment;
  }

  async updateEquipment(equipmentId, equipmentData, requestingUserId, userRole) {
    const equipment = await this.getEquipmentById(equipmentId); // يتضمن التحقق من وجود المعدة

    // التحقق من الصلاحيات
    if (userRole !== 'SUPER_ADMIN' && equipment.branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to update this equipment.');
    }

    const { name, description, quantity, purchaseDate, condition, branchId: newBranchId } = equipmentData;

    // منع تغيير branchId للمعدة إلا بواسطة SUPER_ADMIN (أو قد تقرر منعه تمامًا)
    if (newBranchId && newBranchId !== equipment.branchId && userRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized: Only SUPER_ADMIN can change the equipment\'s parent branch.');
    }
    if (newBranchId && newBranchId !== equipment.branchId) {
        const newBranch = await Branch.findByPk(newBranchId);
        if (!newBranch) throw new Error('New parent branch not found.');
    }
    if (quantity !== undefined && (isNaN(parseInt(quantity)) || parseInt(quantity) < 0)) {
        throw new Error('Quantity must be a non-negative integer.');
    }
    if (purchaseDate && purchaseDate !== null && isNaN(new Date(purchaseDate).getTime())) {
        throw new Error('Invalid purchase date format.');
    }

    let finalPurchaseDate = equipment.purchaseDate;
    if (purchaseDate !== undefined) {
        finalPurchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    }

    const updatedEquipment = await equipment.update({
      name: name !== undefined ? name : equipment.name,
      description: description !== undefined ? description : equipment.description,
      quantity: quantity !== undefined ? parseInt(quantity) : equipment.quantity,
      purchaseDate: finalPurchaseDate, // استخدام المتغير المبسّط
      condition: condition !== undefined ? condition : equipment.condition,
      branchId: newBranchId && userRole === 'SUPER_ADMIN' ? newBranchId : equipment.branchId,
    });
    return updatedEquipment;
  }

  async deleteEquipment(equipmentId, requestingUserId, userRole) {
    const equipment = await this.getEquipmentById(equipmentId); // يتضمن التحقق من وجود المعدة

    // التحقق من الصلاحيات
    if (userRole !== 'SUPER_ADMIN' && equipment.branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to delete this equipment.');
    }

    await equipment.destroy();
    return { message: 'Equipment deleted successfully' };
  }
}

module.exports = new EquipmentService();
