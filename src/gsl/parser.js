import { GSL_GRAMMAR } from './gsl_grammar';
import peg from 'pegjs';

export const parser = peg.generate(GSL_GRAMMAR);
