---
tags: [inbox, raw, unprocessed, Mindverse]
createTime: 2026-04-10 22:30:00
source: arxiv.org/abs/2011.13456
---

# 原始素材（Mindverse未处理）

论文标题：Score-Based Generative Modeling Through Stochastic Differential Equations
作者：Yang Song, Jascha Sohl-Dickstein, Diederik P. Kingma, Abhishek Kumar, Stefano Ermon, Ben Poole
会议：ICLR 2021

## Abstract

Creating noise from data is easy; creating data from noise is generative modeling. We present a stochastic differential equation (SDE) that smoothly transforms a complex data distribution to a known prior distribution by slowly injecting noise, and a corresponding reverse-time SDE that transforms the prior distribution back into the data distribution by slowly removing the noise. Crucially, the reverse-time SDE depends only on the time-dependent gradient field (a.k.a., score) of the perturbed data distribution. By leveraging advances in score-based generative modeling, we can accurately estimate these scores with neural networks, and use numerical SDE solvers to generate samples. We show that this framework encapsulates previous approaches in score-based generative modeling and diffusion probabilistic modeling, allowing for new sampling procedures and new modeling capabilities.

## 1. Introduction

Two successful classes of probabilistic generative models involve sequentially corrupting training data with slowly increasing noise, and then learning to reverse this corruption in order to form a generative model of the data.

**Score matching with Langevin dynamics (SMLD)** estimates the score (i.e., the gradient of the log probability density with respect to data) at each noise scale, and then uses Langevin dynamics to sample from a sequence of decreasing noise scales during generation.

**Denoising diffusion probabilistic modeling (DDPM)** trains a sequence of probabilistic models to reverse each step of the noise corruption, using knowledge of the functional form of the reverse distributions to make training tractable.

## Key Contributions

1. **Flexible sampling and likelihood computation**: Using Predictor-Corrector (PC) samplers and probability flow ODE
2. **Controllable generation**: Modulating generation by conditioning on information not available during training
3. **Unified framework**: Generalizes SMLD and DDPM through the lens of SDEs

## 2. Background

### 2.1 SMLD (Score Matching with Langevin Dynamics)
- Perturbs data with a sequence of noise distributions
- Trains a Noise Conditional Score Network (NCSN)
- Uses Langevin MCMC for sampling

### 2.2 DDPM (Denoising Diffusion Probabilistic Models)
- Considers a Markov chain with prescribed noise scales
- Uses variational inference for training
- Ancestral sampling for generation

## Core Idea

Instead of perturbing data with a finite number of noise distributions, we consider a continuum of distributions that evolve over time according to a diffusion process. The reverse process satisfies a reverse-time SDE, which can be derived from the forward SDE given the score of the marginal probability densities.

## Results

- CIFAR-10: Inception score 9.89, FID 2.20
- Likelihood: 2.99 bits/dim on uniformly dequantized CIFAR-10
- High-fidelity generation of 1024×1024 images for the first time from a score-based model

