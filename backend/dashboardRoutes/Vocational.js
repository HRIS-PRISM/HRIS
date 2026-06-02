const db = require("../db");
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const uploads = multer({ dest: "uploads/" });
const router = express.Router();
const fs = require("fs");
const authenticateToken = require("./authMiddleware");
const socketService = require("../socket/socketService");

router.use(authenticateToken);





router.get("/data", (req, res) => {
  const query = "SELECT * FROM vocational_table";
  db.query(query, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send(result);
  });
});

// CRUD for vocational_table
router.get("/vocational-table", (req, res) => {
  const query = "SELECT * FROM vocational_table";
  db.query(query, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Internal Server Error");
    }
    res.status(200).send(result);
  });
});

// GET vocational by person_id
router.get('/vocational-by-person/:person_id', (req, res) => {
  const { person_id } = req.params;
  const sql = `SELECT * FROM vocational_table WHERE person_id = ?`;
  db.query(sql, [person_id], (err, results) => {
    if (err) {
      console.error('Error fetching vocational by person_id:', err);
      res.status(500).json({ error: 'Failed to fetch vocational records' });
    } else {
      res.json(results);
    }
  });
});

router.post("/vocational-table", (req, res) => {
  const { vocationalNameOfSchool, vocationalDegree, vocationalPeriodFrom, vocationalPeriodTo, vocationalHighestAttained, vocationalYearGraduated, person_id } = req.body;
  const query = "INSERT INTO vocational_table (vocationalNameOfSchool, vocationalDegree, vocationalPeriodFrom, vocationalPeriodTo, vocationalHighestAttained, vocationalYearGraduated, person_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(query, [vocationalNameOfSchool, vocationalDegree, vocationalPeriodFrom, vocationalPeriodTo, vocationalHighestAttained, vocationalYearGraduated, person_id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Internal Server Error");
    }

    socketService.notifyVocationalChanged("created", {
      id: result.insertId,
      person_id,
    });

    res.status(201).send({ message: "Vocational record created", id: result.insertId });
  });
});

router.put("/vocational-table/:id", (req, res) => {
  const { id } = req.params;
  const { vocationalNameOfSchool, vocationalDegree, vocationalPeriodFrom, vocationalPeriodTo, vocationalHighestAttained, vocationalYearGraduated, person_id} = req.body;
  const query = "UPDATE vocational_table SET vocationalNameOfSchool = ?, vocationalDegree = ?, vocationalPeriodFrom = ?, vocationalPeriodTo = ?, vocationalHighestAttained = ?, vocationalYearGraduated = ?, person_id = ? WHERE id = ?";
  db.query(query, [vocationalNameOfSchool, vocationalDegree, vocationalPeriodFrom, vocationalPeriodTo, vocationalHighestAttained, vocationalYearGraduated, person_id, id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Internal Server Error");
    }

    socketService.notifyVocationalChanged("updated", {
      id: Number(id),
      person_id,
    });

    res.status(200).send({ message: "Vocational record updated" });
  });
});

router.delete("/vocational-table/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM vocational_table WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Internal Server Error");
    }

    socketService.notifyVocationalChanged("deleted", { id: Number(id) });

    res.status(200).send({ message: "Vocational record deleted" });
  });
});

module.exports = router;
