# Placement data source

The dashboard uses the public `Placement_Data_Full_Class.csv` dataset from the GitHub repository:

https://raw.githubusercontent.com/ShuklaPrashant21/Campus_Recruitment/master/Placement_Data_Full_Class.csv

The imported dataset contains 215 student records with placement status, gender, academic scores, degree type, work experience, specialization, employability-test score, and MBA percentage. The dashboard normalizes `degree_t` as the branch filter, maps `gender` from M/F, combines specialization and work experience into `skillCategory`, and records the source cohort as 2015 because this public dataset is a single historical cohort. It is labeled as a public 2015 cohort rather than current college data; replace it with approved institution data before using it for official decisions.
