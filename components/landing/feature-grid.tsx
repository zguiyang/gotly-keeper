"use client";

import { motion } from "motion/react";

import { featureCards } from "@/config/landing-page-content";

import styles from "@/app/page.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function FeatureGrid() {
  return (
    <motion.div
      className={styles.featureGrid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
    >
      {featureCards.map((feature) => {
        const Icon = feature.icon;
        return (
          <motion.div key={feature.title} variants={cardVariants} className={styles.cardSurface}>
            <div style={{ padding: "2rem 1.75rem 2rem" }}>
              <p className={styles.featureStep}>{feature.title.split(" ")[0]}</p>
              <div className={styles.featureIcon}>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-on-surface">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {feature.desc}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
