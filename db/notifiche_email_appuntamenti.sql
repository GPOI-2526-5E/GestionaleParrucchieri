CREATE TABLE `notifiche_email_appuntamenti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idAppuntamento` int(11) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `sentAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notifica_appuntamento_tipo` (`idAppuntamento`, `tipo`),
  KEY `idx_notifiche_email_appuntamenti_idAppuntamento` (`idAppuntamento`),
  CONSTRAINT `fk_notifiche_email_appuntamenti_appuntamento`
    FOREIGN KEY (`idAppuntamento`) REFERENCES `appuntamenti` (`idAppuntamento`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
