const db = require("../db");
const express = require("express");
const multer = require("multer");
const fs = require("fs"); // Import file system module
const router = express.Router();
const xlsx = require("xlsx");
const socketService = require("../socket/socketService");
const authenticateToken = require("./authMiddleware");

router.use(authenticateToken);



// CRUD for Children
router.get("/children-table", (req, res) => {
  const query = "SELECT * FROM children_table";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Error fetching children" });
    res.json(results);
  });
});

// For children records
router.get('/children-by-person/:person_id', (req, res) => {
  const { person_id } = req.params;
  const sql = `SELECT * FROM children_table WHERE person_id = ?`;
  db.query(sql, [person_id], (err, results) => {
    if (err) {
      console.error('Error fetching children by person_id:', err);
      res.status(500).json({ error: 'Failed to fetch children' });
    } else {
      res.json(results);
    }
  });
});

router.post("/children-table", (req, res) => {
  const { childrenFirstName, childrenMiddleName, childrenLastName, childrenNameExtension, dateOfBirth, person_id } = req.body;
  const query = `INSERT INTO children_table (childrenFirstName, childrenMiddleName, childrenLastName, childrenNameExtension, dateOfBirth, person_id) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(query, [childrenFirstName, childrenMiddleName, childrenLastName, childrenNameExtension, dateOfBirth, person_id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error adding child" });

    socketService.notifyChildrenTableChanged("created", {
      id: result.insertId,
      person_id,
    });

    res.status(201).json({ message: "Child added", id: result.insertId });
  });
});

router.put("/children-table/:id", (req, res) => {
  const { id } = req.params;
  const { childrenFirstName, childrenMiddleName, childrenLastName, childrenNameExtension, dateOfBirth, person_id } = req.body;
  const query = `UPDATE children_table SET childrenFirstName = ?, childrenMiddleName = ?, childrenLastName = ?, childrenNameExtension = ?, dateOfBirth = ?, person_id = ? WHERE id = ?`;
  db.query(query, [childrenFirstName, childrenMiddleName, childrenLastName, childrenNameExtension, dateOfBirth, person_id, id], (err) => {
    if (err) return res.status(500).json({ error: "Error updating child" });

    socketService.notifyChildrenTableChanged("updated", {
      id: Number(id),
      person_id,
    });

    res.json({ message: "Child updated" });
  });
});

router.delete("/children-table/:id", (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM children_table WHERE id = ?`;
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: "Error deleting child" });

    socketService.notifyChildrenTableChanged("deleted", { id: Number(id) });

    res.json({ message: "Child deleted" });
  });
});


module.exports = router;
