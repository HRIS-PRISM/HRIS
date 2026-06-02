const db = require("../db");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const xlsx = require("xlsx");
const router = express.Router();
const socketService = require("../socket/socketService");
const authenticateToken = require("./authMiddleware");

router.use(authenticateToken);



const upload = multer({ dest: "uploads/" });


function excelDateToUTCDate(excelDate) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}


//data
router.get("/data", (req, res) => {
  const query = `SELECT * FROM eligibility_table`;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send(result);
  });
});

// Read (Get All Eligibility Data)
router.get("/eligibility", (req, res) => {
  const query = "SELECT * FROM eligibility_table";
  db.query(query, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send(result);
  });
});

// For eligibility records
router.get('/eligibility-by-person/:person_id', (req, res) => {
  const { person_id } = req.params;
  const sql = `SELECT * FROM eligibility_table WHERE person_id = ?`;
  db.query(sql, [person_id], (err, results) => {
    if (err) {
      console.error('Error fetching eligibility by person_id:', err);
      res.status(500).json({ error: 'Failed to fetch eligibility records' });
    } else {
      res.json(results);
    }
  });
});

// Create (Add New Eligibility)
router.post("/eligibility", (req, res) => {
  const { eligibilityName, eligibilityRating, eligibilityDateOfExam, eligibilityPlaceOfExam, licenseNumber, DateOfValidity, person_id } = req.body;
  const query = "INSERT INTO eligibility_table (eligibilityName, eligibilityRating, eligibilityDateOfExam, eligibilityPlaceOfExam, licenseNumber, DateOfValidity, person_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(query, [eligibilityName, eligibilityRating, eligibilityDateOfExam, eligibilityPlaceOfExam, licenseNumber, DateOfValidity, person_id], (err, result) => {
    if (err) {
      console.error("Error adding eligibility:", err);
      return res.status(500).send(err);
    }

    socketService.notifyEligibilityChanged("created", {
      id: result.insertId,
      person_id,
    });

    res.status(201).send({ message: "Eligibility created", id: result.insertId });
  });
});

// Update Eligibility Record
router.put("/eligibility/:id", (req, res) => {
  const { eligibilityName, eligibilityRating, eligibilityDateOfExam, eligibilityPlaceOfExam, licenseNumber, DateOfValidity, person_id } = req.body;
  const { id } = req.params;
  const query = "UPDATE eligibility_table SET eligibilityName = ?, eligibilityRating = ?, eligibilityDateOfExam = ?, eligibilityPlaceOfExam = ?, licenseNumber = ?, DateOfValidity = ?, person_id = ? WHERE id = ?";
  db.query(query, [eligibilityName, eligibilityRating, eligibilityDateOfExam, eligibilityPlaceOfExam, licenseNumber, DateOfValidity, person_id, id], (err, result) => {
    if (err) {
      console.error("Error updating eligibility:", err);
      return res.status(500).send({ message: "Error updating eligibility" });
    }

    socketService.notifyEligibilityChanged("updated", {
      id: Number(id),
      person_id,
    });

    res.status(200).send({ message: "Eligibility record updated" });
  });
});

// Delete Eligibility Record
router.delete("/eligibility/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM eligibility_table WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send(err);

    socketService.notifyEligibilityChanged("deleted", { id: Number(id) });

    res.status(200).send({ message: "Eligibility record deleted" });
  });
});

module.exports = router;
