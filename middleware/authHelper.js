const School = require("../model/school");
const Branch = require("../model/branch");
const BranchGroup = require("../model/branchGroup");

const findAuthEntityById = async (id) => {
  const [school, branch, branchGroup] = await Promise.all([
    School.findById(id).select("_id role username Active").lean(),
    Branch.findById(id).select("_id role username Active").lean(),
    BranchGroup.findById(id).select("_id role AssignedBranch username Active").lean(),
  ]);

  if (school) {
    return { type: "school", user: school };
  }

  if (branch) {
    return { type: "branch", user: branch };
  }

  if (branchGroup) {
    return { type: "branchGroup", user: branchGroup };
  }

  return null;
};

module.exports = { findAuthEntityById };