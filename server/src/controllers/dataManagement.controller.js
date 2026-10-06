import DataManagementService from '../services/dataManagement.service.js';

export const getDataSummary = async (req, res, next) => {
  try {
    const summary = await DataManagementService.getDataSummary();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getTestData = async (req, res, next) => {
  try {
    const result = await DataManagementService.getTestDataRecords(req.query);
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTestData = async (req, res, next) => {
  try {
    const result = await DataManagementService.deleteTestData(req.body, req.user);
    return res.status(200).json({
      success: true,
      message: result.message,
      deletedCounts: result.deletedCounts,
    });
  } catch (error) {
    next(error);
  }
};
