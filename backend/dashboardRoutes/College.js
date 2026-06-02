const db = require("../db");
const express = require("express");
const multer = require("multer");
const socketService = require("../socket/socketService");

const fs = require("fs"); // Import file system module
const xlsx = require("xlsx");
const router = express.Router();
const upload = multer({ dest: "uploads/" });
const authenticateToken = require("./authMiddleware");

router.use(authenticateToken);



router.get("/data", (req, res) => {
  const query = `SELECT * FROM college_table`;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send(result);
  });
});

// Read (Get All Colleges)
router.get("/college-table", (req, res) => {
  const query = "SELECT * FROM college_table";
  db.query(query, (err, result) => {
    if (err) return res.status(500).send({ message: "Internal Server Error" });
    res.status(200).send(result);
  });
});

router.get('/college-by-person/:person_id', (req, res) => {
  const { person_id } = req.params;
  const sql = `SELECT * FROM college_table WHERE person_id = ?`;
  db.query(sql, [person_id], (err, results) => {
    if (err) {
      console.error('Error fetching college by person_id:', err);
      res.status(500).json({ error: 'Failed to fetch college records' });
    } else {
      res.json(results);
    }
  });
});

// Create (Add New College Entry)
router.post("/college-table", (req, res) => {
  const { collegeNameOfSchool, collegeDegree, collegePeriodFrom, collegePeriodTo, collegeHighestAttained, collegeYearGraduated, collegeScholarshipAcademicHonorsReceived, person_id } = req.body;

  const query = `
    INSERT INTO college_table (
      collegeNameOfSchool,
      collegeDegree,
      collegePeriodFrom,
      collegePeriodTo,
      collegeHighestAttained,
      collegeYearGraduated,
      collegeScholarshipAcademicHonorsReceived,
      person_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [collegeNameOfSchool, collegeDegree, collegePeriodFrom, collegePeriodTo, collegeHighestAttained, collegeYearGraduated, collegeScholarshipAcademicHonorsReceived, person_id], (err, result) => {
    if (err) return res.status(500).send({ message: "Internal Server Error" });

    // Socket.IO (Option A): notify others to refresh
    socketService.notifyCollegeTableChanged("created", {
      id: result.insertId,
      person_id,
    });

    res.status(201).send({ message: "College entry created", id: result.insertId });
  });
});

// Update College Entry
router.put("/college-table/:id", (req, res) => {
  const { collegeNameOfSchool, collegeDegree, collegePeriodFrom, collegePeriodTo, collegeHighestAttained, collegeYearGraduated, collegeScholarshipAcademicHonorsReceived, person_id } = req.body;

  const { id } = req.params;
  const query = `
    UPDATE college_table SET
      collegeNameOfSchool = ?,
      collegeDegree = ?,
      collegePeriodFrom = ?,
      collegePeriodTo = ?,
      collegeHighestAttained = ?,
      collegeYearGraduated = ?,
      collegeScholarshipAcademicHonorsReceived = ?,
      person_id = ?
    WHERE id = ?`;

  db.query(query, [collegeNameOfSchool, collegeDegree, collegePeriodFrom, collegePeriodTo, collegeHighestAttained, collegeYearGraduated, collegeScholarshipAcademicHonorsReceived, person_id, id], (err, result) => {
    if (err) return res.status(500).send({ message: "Internal Server Error" });

    // Socket.IO (Option A): notify others to refresh
    socketService.notifyCollegeTableChanged("updated", {
      id: Number(id),
      person_id,
    });

    res.status(200).send({ message: "College entry updated" });
  });
});

// Delete College Entry
router.delete("/college-table/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM college_table WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send({ message: "Internal Server Error" });

    // Socket.IO (Option A): notify others to refresh
    socketService.notifyCollegeTableChanged("deleted", { id: Number(id) });

    res.status(200).send({ message: "College entry deleted" });
  });
});

//end of CRUD app


module.exports = router;
