import fs from "fs"
import { getHmFindings } from "../../parse-md.js"

let pdf = [
  "https://cdn.cantina.xyz/reports/cantina_competition_babylon_may2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_aave_may2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_optimism_may2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_venus_apr2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_goat_mar2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_eigenlayer_mar2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_arcade_mar2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_opal_feb2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_superform_erc115A_dec2023.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_zerolend_jan2024.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_superform_erc1155a_dec2023.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_morpho_metamorpho_dec2023.pdf",
  "https://cdn.cantina.xyz/reports/cantina_competition_morpho_blue_dec2023.pdf",
]
