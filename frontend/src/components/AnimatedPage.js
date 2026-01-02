// src/components/AnimatedPage.js

import React from 'react';
import { motion } from 'framer-motion';

// Animasyon ayarları
const pageVariants = {
  initial: {
    opacity: 0,
    x: "-200px" // Soldan gelsin
  },
  animate: {
    opacity: 1,
    x: 0, // Ortaya gelsin
    transition: { type: "spring", stiffness: 100, damping: 20 }
  },
  exit: {
    opacity: 0,
    x: "200px", // Sağa doğru çıksın
    transition: { ease: "easeInOut" }
  }
};

const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children} 
    </motion.div>
  );
};

export default AnimatedPage;